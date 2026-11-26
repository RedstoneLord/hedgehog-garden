package dev.redstonelord.hedgehoggarden;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.util.AtomicFile;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public final class GardenActivity extends Activity {
    private static final String GAME_URL = "https://appassets.androidplatform.net/game/play.html";
    private static final int PICK_JSON = 1;
    private static final int EXPORT_JSON = 2;
    private static final int INSTALL_PERMISSION = 3;
    private static final int MAX_SAVE_CHARS = 8 * 1024 * 1024;
    private static final String TAG = "HedgehogGarden";
    private WebView web;
    private SaveBridge saves;
    private GitHubUpdates updates;
    private ValueCallback<Uri[]> fileChooser;
    private String exportJson;
    private GitHubUpdates.Release pendingInstall;

    @Override public void onCreate(Bundle previous) {
        super.onCreate(previous);
        saves = new SaveBridge(new AtomicFile(new File(getFilesDir(), "orchard-save.json")));
        web = new WebView(this);
        web.setBackgroundColor(0xff34293a);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(saves, "OrchardAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !GAME_URL.equals(request.getUrl().toString());
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (GAME_URL.equals(url) && "GET".equals(request.getMethod())) {
                    try {
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK",
                            Collections.singletonMap("Content-Security-Policy",
                                "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; frame-src 'none'; base-uri 'none'; form-action 'none'"),
                            getAssets().open("play.html"));
                    } catch (IOException error) {
                        Log.e(TAG, "Could not open the bundled game", error);
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooser != null) fileChooser.onReceiveValue(null);
                fileChooser = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.setType("*/*");
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(picker, PICK_JSON);
                } catch (ActivityNotFoundException error) {
                    fileChooser = null;
                    callback.onReceiveValue(null);
                    message("На устройстве не найдено приложение для открытия файла.");
                }
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(GAME_URL);
        updates = new GitHubUpdates(this);
    }

    @Override protected void onResume() {
        super.onResume();
        web.onResume();
        updates.check();
    }

    @Override protected void onPause() {
        flushSave(null);
        web.onPause();
        super.onPause();
    }

    @Override protected void onDestroy() {
        updates.close();
        if (fileChooser != null) fileChooser.onReceiveValue(null);
        web.removeJavascriptInterface("OrchardAndroid");
        web.destroy();
        super.onDestroy();
    }

    void flushSave(Runnable next) {
        web.evaluateJavascript("window.orchardFlushSave?.()", value -> {
            if (next != null && !isFinishing() && !isDestroyed()) next.run();
        });
    }

    void offerInstall(GitHubUpdates.Release release) {
        if (!getPackageManager().canRequestPackageInstalls()) {
            pendingInstall = release;
            try {
                startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName())), INSTALL_PERMISSION);
            } catch (ActivityNotFoundException e) {
                pendingInstall = null;
                message("Android не разрешает установку обновлений из этого приложения.");
            }
            return;
        }
        flushSave(() -> install(release));
    }

    private void install(GitHubUpdates.Release release) {
        if (!updates.isVerified(release)) {
            message("Файл обновления недоступен. Проверим ещё раз при запуске.");
            return;
        }
        Intent installer = new Intent(Intent.ACTION_VIEW);
        installer.setDataAndType(UpdateProvider.uri(getPackageName()), UpdateProvider.MIME_TYPE);
        installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(installer);
        } catch (ActivityNotFoundException | SecurityException error) {
            Log.w(TAG, "Could not open package installer", error);
            message("Не удалось открыть установщик Android.");
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_JSON) {
            ValueCallback<Uri[]> callback = fileChooser;
            fileChooser = null;
            if (callback != null) callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
        } else if (request == EXPORT_JSON) {
            String json = exportJson;
            exportJson = null;
            if (json == null || result != RESULT_OK || data == null || data.getData() == null) return;
            try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                if (stream == null) throw new IOException("No output stream");
                stream.write(json.getBytes(StandardCharsets.UTF_8));
            } catch (IOException | SecurityException error) {
                Log.w(TAG, "Could not export save", error);
                message("Не удалось сохранить файл.");
            }
        } else if (request == INSTALL_PERMISSION) {
            GitHubUpdates.Release release = pendingInstall;
            pendingInstall = null;
            if (release != null && getPackageManager().canRequestPackageInstalls()) {
                flushSave(() -> install(release));
            }
        }
    }

    void message(String text) {
        Toast.makeText(this, text, Toast.LENGTH_LONG).show();
    }

    final class SaveBridge {
        private final AtomicFile save;
        private String lastWritten;

        SaveBridge(AtomicFile save) {
            this.save = save;
        }

        @JavascriptInterface public synchronized String readSave() {
            try {
                byte[] contents = save.readFully();
                lastWritten = new String(contents, StandardCharsets.UTF_8);
                return lastWritten;
            } catch (FileNotFoundException none) {
                return null;
            } catch (IOException error) {
                Log.e(TAG, "Could not read saved garden", error);
                return null;
            }
        }

        @JavascriptInterface public synchronized boolean writeSave(String json) {
            if (json == null || json.length() > MAX_SAVE_CHARS || !json.startsWith("{")) return false;
            if (json.equals(lastWritten)) return true;
            FileOutputStream stream = null;
            try {
                stream = save.startWrite();
                stream.write(json.getBytes(StandardCharsets.UTF_8));
                save.finishWrite(stream);
                lastWritten = json;
                return true;
            } catch (IOException error) {
                if (stream != null) save.failWrite(stream);
                Log.e(TAG, "Could not write saved garden", error);
                return false;
            }
        }

        @JavascriptInterface public void exportSave(String json) {
            if (json == null || json.length() > MAX_SAVE_CHARS) return;
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed() || exportJson != null) return;
                exportJson = json;
                Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("application/json");
                picker.putExtra(Intent.EXTRA_TITLE, "orchard-save.json");
                try {
                    startActivityForResult(picker, EXPORT_JSON);
                } catch (ActivityNotFoundException error) {
                    exportJson = null;
                    message("На устройстве не найдено приложение для сохранения файла.");
                }
            });
        }
    }
}
