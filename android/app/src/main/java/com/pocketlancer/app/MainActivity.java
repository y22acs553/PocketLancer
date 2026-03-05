package com.pocketlancer.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableWebViewDarkMode();
    }

    /**
     * Disables dark mode in the Capacitor WebView across all Android versions.
     *
     * Android applies dark mode to WebViews in two different ways depending on API level:
     *
     *   • API 29–32 (Android 10–12): "Force Dark" — Android inverts light-themed
     *     web content automatically. Disabled via FORCE_DARK_OFF.
     *
     *   • API 33+  (Android 13+): "Algorithmic Darkening" — replaced Force Dark with
     *     a smarter algorithm, but it still darkens content. Disabled via
     *     setAlgorithmicDarkeningAllowed(false).
     *
     * Both are feature-gated so this runs safely on all devices.
     * The AndroidManifest android:forceDarkAllowed="false" covers the app/theme level,
     * but this method covers the WebView settings level — both are needed.
     */
    private void disableWebViewDarkMode() {
        if (getBridge() == null || getBridge().getWebView() == null) return;

        WebSettings settings = getBridge().getWebView().getSettings();

        // Android 10–12 (API 29–32)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }

        // Android 13+ (API 33+)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        }
    }
}