package dev.redstonelord.hedgehoggarden;

import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
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
    private static final long CHECK_INTERVAL = 30 * 60 * 1000L;
    private static final long RETRY_INTERVAL = 5 * 60 * 1000L;
    private static final Pattern RELEASE_TAG = Pattern.compile("v?(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,2})\\.(0|[1-9][0-9]{0,2})");
    private static final Pattern SHA256 = Pattern.compile("sha256:[0-9a-f]{64}");

    private final GardenActivity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private long nextCheck;
    private boolean checking;
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
        long code = major * 1_000_000L + minor * 1000 + patch;
        if (code <= installed || code > 2_100_000_000L) return null;
        String version = major + "." + minor + "." + patch;
        String filename = "hedgehog-garden-" + version + ".apk";

        JSONArray assets = result.optJSONArray("assets");
        if (assets == null) return null;
        for (int i = 0; i < assets.length(); ++i) {
            JSONObject asset = assets.getJSONObject(i);
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

    void check() {
        long now = SystemClock.elapsedRealtime();
        if (checking || nextCheck > now || executor.isShutdown()) return;
        checking = true;
        nextCheck = now + CHECK_INTERVAL;
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
            activity.runOnUiThread(() -> {
                checking = false;
                if (retry) nextCheck = SystemClock.elapsedRealtime() + RETRY_INTERVAL;
                if (release == null || activity.isFinishing() || activity.isDestroyed()) return;
                prompt = new AlertDialog.Builder(activity)
                    .setTitle("Обновление " + release.version)
                    .setMessage("Новая версия уже скачана. Сохранение останется на этом устройстве.")
                    .setPositiveButton("Установить", (dialog, button) -> activity.offerInstall(release))
                    .setNegativeButton("Позже", null)
                    .show();
            });
        });
    }

    void close() {
        if (prompt != null) prompt.dismiss();
        executor.shutdownNow();
    }

    private Release downloadNewer() throws Exception {
        long installed = versionCode(installedPackage());
        URL url = new URL("https://api.github.com/repos/" + REPO + "/releases/latest");
        HttpURLConnection request = connection(url);
        request.setRequestProperty("Accept", "application/vnd.github+json");
        Release release;
        try {
            int status = request.getResponseCode();
            if (status == 404) return null;
            if (status != 200) throw new IOException("GitHub Releases returned HTTP " + status);
            ByteArrayOutputStream json = new ByteArrayOutputStream();
            try (InputStream input = request.getInputStream()) {
                copy(input, json, MAX_RELEASE);
            }
            release = newerRelease(new JSONObject(json.toString("UTF-8")), installed);
        } finally {
            request.disconnect();
        }
        if (release == null || isVerified(release)) return release;
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

    private static HttpURLConnection connection(URL url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
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
