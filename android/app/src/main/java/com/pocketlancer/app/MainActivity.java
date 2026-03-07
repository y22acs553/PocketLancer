package com.pocketlancer.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableWebViewDarkMode();
        requestAllPermissionsOnFirstLaunch();
    }

    /**
     * Requests all permissions the app needs upfront on first launch,
     * so the user sees all permission dialogs immediately instead of
     * being surprised mid-flow (e.g. GPS failing silently during search).
     *
     * Permissions requested:
     *   - ACCESS_FINE_LOCATION   — required for field service freelancer search
     *   - ACCESS_COARSE_LOCATION — fallback / cell-tower location
     *   - POST_NOTIFICATIONS     — required on Android 13+ (API 33+) for push notifications
     */
    private void requestAllPermissionsOnFirstLaunch() {
        List<String> permissionsToRequest = new ArrayList<>();

        // Location permissions
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        // POST_NOTIFICATIONS is only a runtime permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    permissionsToRequest.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE
            );
        }
    }

    /**
     * Disables dark mode in the Capacitor WebView across all Android versions.
     *
     * Android applies dark mode to WebViews in two different ways:
     *   • API 29–32 (Android 10–12): Force Dark — disabled via FORCE_DARK_OFF
     *   • API 33+  (Android 13+):    Algorithmic Darkening — disabled via setAlgorithmicDarkeningAllowed(false)
     *
     * The AndroidManifest android:forceDarkAllowed="false" covers the theme level,
     * but this covers the WebView settings level — both are needed.
     */
    private void disableWebViewDarkMode() {
        if (getBridge() == null || getBridge().getWebView() == null) return;

        WebSettings settings = getBridge().getWebView().getSettings();

        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        }
    }
}