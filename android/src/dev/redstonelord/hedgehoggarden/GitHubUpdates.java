package dev.redstonelord.hedgehoggarden;

import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

final class GitHubUpdates {
    static final String REPO = "RedstoneLord/hedgehog-garden";
    private static final String TAG = "GardenUpdates";
    private static final int MAX_APK = 50 * 1024 * 1024;
    private static final int MAX_RELEASE = 2 * 1024 * 1024;
    private static final long CHECK_INTERVAL = 15 * 60 * 1000L;
    private static final long RETRY_INTERVAL = 2 * 60 * 1000L;
    private static final Pattern RELEASE_TAG = Pattern.compile("v?(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,2})\\.(0|[1-9][0-9]{0,2})(?:\\.([1-9][0-9]?))?");
    private static final long LAST_LEGACY_ANDROID_CODE = 5002;
    private static final Pattern SHA256 = Pattern.compile("sha256:[0-9a-f]{64}");

    private final GardenActivity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable poll = () -> check(false);
    private long nextCheck;
    private long nextPrompt;
    private boolean resumed;
    private boolean checking;
    private boolean reportResult;
    private Release ready;
    private AlertDialog prompt;

    GitHubUpdates(GardenActivity activity) {
        this.activity = activity;
    }

    static final class Release {
        final String version;
        final long code;
        final URL assetUrl;
        final int size;
        final String digest;

        Release(String version, long code, URL assetUrl, int size, String digest) {
            this.version = version;
            this.code = code;
            this.assetUrl = assetUrl;
            this.size = size;
            this.digest = digest;
        }
    }

    static Release newerRelease(JSONObject result, long installed) throws Exception {
        if (result.optBoolean("draft") || result.optBoolean("prerelease")) return null;
        String tag = result.optString("tag_name");
        Matcher match = RELEASE_TAG.matcher(tag);
        if (!match.matches()) return null;
        int major = Integer.parseInt(match.group(1));
        int minor = Integer.parseInt(match.group(2));
        int patch = Integer.parseInt(match.group(3));
        long base = major * 1_000_000L + minor * 1000 + patch;
        int hotfix = match.group(4) == null ? 0 : Integer.parseInt(match.group(4));
        if (base == 0 || (hotfix != 0 && base < LAST_LEGACY_ANDROID_CODE)) return null;
        long code = hotfix != 0 || base > LAST_LEGACY_ANDROID_CODE ? base * 100 + hotfix : base;
        if (code <= installed || code > 2_100_000_000L) return null;
        String version = major + "." + minor + "." + patch + (hotfix == 0 ? "" : "." + hotfix);
        String filename = "hedgehog-garden-" + version + ".apk";

        JSONArray assets = result.optJSONArray("assets");
        if (assets == null) return null;
        for (int i = 0; i < assets.length(); ++i) {
            JSONObject asset = assets.optJSONObject(i);
            if (asset == null) continue;
            if (!filename.equals(asset.optString("name")) || !"uploaded".equals(asset.optString("state"))) continue;
            String expected = "https://github.com/" + REPO + "/releases/download/" + tag + "/" + filename;
            if (!expected.equals(asset.optString("browser_download_url"))) continue;
            int size = asset.optInt("size");
            String digest = asset.isNull("digest") ? "" : asset.optString("digest");
            if (size < 1 || size > MAX_APK || (!digest.isEmpty() && !SHA256.matcher(digest).matches())) continue;
            return new Release(version, code, new URL(expected), size, digest);
        }
        return null;
    }

    static Release newestRelease(JSONArray releases, long installed) throws Exception {
        Release result = null;
        for (int i = 0; i < releases.length(); i++) {
            JSONObject entry = releases.optJSONObject(i);
            if (entry == null) continue;
            Release candidate = newerRelease(entry, result == null ? installed : result.code);
            if (candidate != null) result = candidate;
        }
        return result;
    }

    void resume() {
        resumed = true;
        check(false);
    }

    void pause() {
        resumed = false;
        main.removeCallbacks(poll);
    }

    void checkNow() {
        activity.message("Проверяем обновления…");
        check(true);
    }

    private void check(boolean manual) {
        if (!resumed || executor.isShutdown()) return;
        reportResult |= manual;
        if (checking) return;
        long now = SystemClock.elapsedRealtime();
        if (!manual && nextCheck > now) {
            if (ready != null && nextPrompt <= now) showPrompt();
            schedule();
            return;
        }
        main.removeCallbacks(poll);
        checking = true;
        executor.execute(() -> {
            Release downloaded = null;
            boolean failed = false;
            try {
                downloaded = downloadNewer();
            } catch (Exception error) {
                failed = true;
                Log.w(TAG, "GitHub update check failed", error);
            }
            Release release = downloaded;
            boolean retry = failed;
            main.post(() -> {
                checking = false;
                if (executor.isShutdown()) return;
                long finished = SystemClock.elapsedRealtime();
                nextCheck = finished + (retry ? RETRY_INTERVAL : CHECK_INTERVAL);
                boolean showResult = reportResult;
                reportResult = false;
                if (release != null && (ready == null || release.code != ready.code)) {
                    nextPrompt = 0;
                    if (prompt != null) prompt.dismiss();
                }
                if (!retry) ready = release;
                if (resumed) {
                    if (ready != null && (showResult || nextPrompt <= finished)) showPrompt();
                    else if (showResult) activity.message(retry ? "Не удалось проверить обновления. Попробуй ещё раз."
                        : "Установлена последняя версия.");
                }
                schedule();
            });
        });
    }

    private void showPrompt() {
        if (activity.isFinishing() || activity.isDestroyed() || prompt != null && prompt.isShowing()) return;
        Release release = ready;
        prompt = new AlertDialog.Builder(activity)
            .setTitle("Обновление " + release.version)
            .setMessage("Новая версия уже скачана. Сохранение останется на этом устройстве.")
            .setPositiveButton("Установить", (dialog, button) -> {
                postponePrompt();
                activity.offerInstall(release);
            })
            .setNegativeButton("Позже", (dialog, button) -> postponePrompt())
            .setOnCancelListener(dialog -> postponePrompt())
            .show();
    }

    private void postponePrompt() {
        nextPrompt = SystemClock.elapsedRealtime() + CHECK_INTERVAL;
        schedule();
    }

    private void schedule() {
        main.removeCallbacks(poll);
        if (resumed && !checking) {
            long now = SystemClock.elapsedRealtime();
            long next = ready != null && nextPrompt > now ? Math.min(nextCheck, nextPrompt) : nextCheck;
            main.postDelayed(poll, Math.max(0, next - now));
        }
    }

    void close() {
        pause();
        if (prompt != null) prompt.dismiss();
        executor.shutdownNow();
    }

    private Release downloadNewer() throws Exception {
        long installed = versionCode(installedPackage());
        URL url = new URL("https://api.github.com/repos/" + REPO + "/releases?per_page=20");
        HttpURLConnection request = connection(url);
        request.setRequestProperty("Accept", "application/vnd.github+json");
        request.setRequestProperty("Cache-Control", "no-cache");
        Release release;
        try {
            int status = request.getResponseCode();
            if (status != 200) throw new IOException("GitHub Releases returned HTTP " + status);
            ByteArrayOutputStream json = new ByteArrayOutputStream();
            try (InputStream input = request.getInputStream()) {
                copy(input, json, MAX_RELEASE);
            }
            release = newestRelease(new JSONArray(json.toString("UTF-8")), installed);
        } finally {
            request.disconnect();
        }
        if (release == null || isVerified(release) && matchesDigest(updateFile(), release.digest)) return release;
        File temporary = File.createTempFile("update-", ".apk", activity.getCacheDir());
        try {
            download(release, temporary);
            if (!matchesInstalledApp(temporary, release)) throw new IOException("Update package or certificate mismatch");
            Files.move(temporary.toPath(), updateFile().toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            temporary.delete();
        }
        return release;
    }

    private static void download(Release release, File file) throws Exception {
        URL url = release.assetUrl;
        for (int redirects = 0; redirects < 5; ++redirects) {
            HttpURLConnection request = connection(url);
            try {
                int status = request.getResponseCode();
                if (status >= 300 && status < 400) {
                    String location = request.getHeaderField("Location");
                    if (location == null) throw new IOException("Missing update download redirect");
                    URL next = new URL(url, location);
                    String host = next.getHost();
                    if (!"https".equals(next.getProtocol()) || next.getUserInfo() != null || next.getPort() != -1
                        || !("release-assets.githubusercontent.com".equals(host) || "objects.githubusercontent.com".equals(host)
                            || "github.com".equals(host) && next.getPath().equals(release.assetUrl.getPath()))) {
                        throw new IOException("Unexpected update download redirect");
                    }
                    url = next;
                    continue;
                }
                if (status != 200) throw new IOException("APK download returned HTTP " + status);
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                int bytes;
                try (InputStream input = request.getInputStream();
                     OutputStream output = new DigestOutputStream(new FileOutputStream(file), sha256)) {
                    bytes = copy(input, output, release.size);
                }
                if (bytes != release.size) throw new IOException("Incomplete APK");
                byte[] hash = sha256.digest();
                if (!release.digest.isEmpty() && !release.digest.equals("sha256:" + hex(hash))) {
                    throw new IOException("APK download checksum mismatch");
                }
                return;
            } finally {
                request.disconnect();
            }
        }
        throw new IOException("Too many update redirects");
    }

    private static boolean matchesDigest(File file, String expected) throws Exception {
        if (expected.isEmpty()) return true;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = Files.newInputStream(file.toPath())) {
            byte[] buffer = new byte[16384];
            int bytes;
            while ((bytes = input.read(buffer)) != -1) digest.update(buffer, 0, bytes);
        }
        return expected.equals("sha256:" + hex(digest.digest()));
    }

    private static HttpURLConnection connection(URL url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setConnectTimeout(9000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("User-Agent", "HedgehogGarden-Android");
        return connection;
    }

    private static int copy(InputStream input, OutputStream output, int limit) throws IOException {
        byte[] buffer = new byte[16384];
        int total = 0;
        int count;
        while ((count = input.read(buffer)) != -1) {
            if (Thread.currentThread().isInterrupted()) throw new IOException("Update interrupted");
            total += count;
            if (total > limit) throw new IOException("Update exceeds its size limit");
            output.write(buffer, 0, count);
        }
        return total;
    }

    private static String hex(byte[] data) {
        StringBuilder result = new StringBuilder(data.length * 2);
        for (byte value : data) {
            result.append(Character.forDigit((value & 0xff) >>> 4, 16));
            result.append(Character.forDigit(value & 0xf, 16));
        }
        return result.toString();
    }

    boolean isVerified(Release release) {
        File apk = updateFile();
        if (apk.length() != release.size) return false;
        try {
            return matchesInstalledApp(apk, release);
        } catch (Exception invalid) {
            Log.w(TAG, "Could not verify APK", invalid);
            return false;
        }
    }

    private File updateFile() {
        return new File(activity.getCacheDir(), UpdateProvider.FILENAME);
    }

    private boolean matchesInstalledApp(File apk, Release release) throws PackageManager.NameNotFoundException {
        PackageInfo current = installedPackage();
        PackageInfo candidate = activity.getPackageManager().getPackageArchiveInfo(apk.getPath(), signatureFlag());
        if (candidate == null || !current.packageName.equals(candidate.packageName)
            || versionCode(candidate) != release.code || versionCode(candidate) <= versionCode(current)) return false;
        Signature[] installed = signatures(current);
        Signature[] next = signatures(candidate);
        return installed.length != 0 && installed.length == next.length && Arrays.asList(installed).containsAll(Arrays.asList(next));
    }

    private PackageInfo installedPackage() throws PackageManager.NameNotFoundException {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), signatureFlag());
    }

    private static int signatureFlag() {
        return Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
    }

    private static long versionCode(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    private static Signature[] signatures(PackageInfo info) {
        Signature[] certificates = Build.VERSION.SDK_INT >= 28
            ? (info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners()) : info.signatures;
        return certificates == null ? new Signature[0] : certificates;
    }
}
