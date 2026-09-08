package app.quiltt.connector

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.URLUtil
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class QuilttConnectorWebView(context: Context) : WebView(context) {
    init {
        visibility = View.VISIBLE
        layoutParams = LayoutParams(MATCH_PARENT, MATCH_PARENT)
        this.settings.javaScriptEnabled = true
        this.settings.domStorageEnabled = true
    }

    fun load(
        token: String?,
        config: QuilttConnectorConfiguration,
        onEvent: ConnectorSDKOnEventCallback? = null,
        onExit: ConnectorSDKOnEventExitCallback? = null,
        onExitSuccess: ConnectorSDKOnExitSuccessCallback? = null,
        onExitAbort: ConnectorSDKOnExitAbortCallback? = null,
        onExitError: ConnectorSDKOnExitErrorCallback? = null
    ) {
        val clientParams = QuilttConnectorWebViewClientParams(
            context = context,
            webView = this,
            config = config,
            token = token,
            onEvent = onEvent,
            onExit = onExit,
            onExitSuccess = onExitSuccess,
            onExitAbort = onExitAbort,
            onExitError = onExitError
        )
        this.webViewClient = QuilttConnectorWebViewClient(clientParams)
        
        // Apply smart URL encoding to the app launcher URL
        val safeAppLauncherUrl = UrlUtils.smartEncodeURIComponent(config.appLauncherUrl)
        
        // Build the URL using Uri.Builder to properly handle parameter encoding
        val urlBuilder = Uri.Builder()
            .scheme("https")
            .authority("${config.connectorId}.quiltt.app")
            .appendQueryParameter("mode", "webview")
            .appendQueryParameter("agent", "android-${quilttSdkVersion}")
        
        // Handle the app launcher URL with special care
        if (UrlUtils.isEncoded(safeAppLauncherUrl)) {
            // If already encoded, decode once to prevent double encoding
            val decodedOnce = Uri.decode(safeAppLauncherUrl)
            urlBuilder.appendQueryParameter("app_launcher_url", decodedOnce)
        } else {
            urlBuilder.appendQueryParameter("app_launcher_url", safeAppLauncherUrl)
        }

        // Add theme mode if provided
        config.themeMode?.let { themeMode ->
            urlBuilder.appendQueryParameter("theme_mode", themeMode)
        }
        
        val url = urlBuilder.build().toString()
        val sdkAgent = TelemetryUtils.getSDKAgent(
            quilttSdkVersion,
            TelemetryUtils.getRuntimePlatformInfo()
        )
        val headers = mapOf("Quiltt-SDK-Agent" to sdkAgent)
        this.loadUrl(url, headers)
    }
}

data class QuilttConnectorWebViewClientParams(
    val context: Context,
    val webView: WebView,
    val config: QuilttConnectorConfiguration,
    val token: String?,
    val onEvent: ConnectorSDKOnEventCallback? = null,
    val onExit: ConnectorSDKOnEventExitCallback? = null,
    val onExitSuccess: ConnectorSDKOnExitSuccessCallback? = null,
    val onExitAbort: ConnectorSDKOnExitAbortCallback? = null,
    val onExitError: ConnectorSDKOnExitErrorCallback? = null
)

class QuilttConnectorWebViewClient(private val params: QuilttConnectorWebViewClientParams) : WebViewClient() {
    
    companion object {
        private const val TAG = "QuilttConnectorWebView"
    }
    
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url = request.url
        Log.d(TAG, "Intercepted URL: $url")
        if (isQuilttEvent(url)) {
            handleQuilttEvent(url)
            return true
        }
        if (shouldRender(url)) {
            return false
        }
        handleOAuthUrl(url)
        return true
    }

    private fun handleQuilttEvent(url: Uri) {
        val urlComponents = Uri.parse(url.toString())
        val connectorId = params.config.connectorId
        val profileId = urlComponents.getQueryParameter("profileId")
        val connectionId = urlComponents.getQueryParameter("connectionId")
        val metadata = ConnectorSDKCallbackMetadata(
            connectorId = connectorId,
            profileId = profileId,
            connectionId = connectionId,
        )
        Log.d(TAG, "handleQuilttEvent: $url")
        when (url.host) {
            "Load" -> {
                initInjectJavaScript()
                params.onEvent?.invoke(ConnectorSDKEventType.Load, metadata)
            }
            "ExitAbort" -> {
                clearLocalStorage()
                params.onEvent?.invoke(ConnectorSDKEventType.ExitAbort, metadata)
                params.onExit?.invoke(ConnectorSDKEventType.ExitAbort, metadata)
                params.onExitAbort?.invoke(metadata)
            }
            "ExitError" -> {
                clearLocalStorage()
                params.onEvent?.invoke(ConnectorSDKEventType.ExitError, metadata)
                params.onExit?.invoke(ConnectorSDKEventType.ExitError, metadata)
                params.onExitError?.invoke(metadata)
            }
            "ExitSuccess" -> {
                clearLocalStorage()
                params.onEvent?.invoke(ConnectorSDKEventType.ExitSuccess, metadata)
                params.onExit?.invoke(ConnectorSDKEventType.ExitSuccess, metadata)
                params.onExitSuccess?.invoke(metadata)
            }
            "Authenticate" -> {
                Log.d(TAG, "Authenticate: $profileId")
            }
            "Navigate" -> {
                val navigateUrlString = urlComponents.getQueryParameter("url")
                if (navigateUrlString != null) {
                    handleNavigateUrl(navigateUrlString)
                } else {
                    Log.w(TAG, "Navigate URL missing from request")
                }
            }
            else -> {
                Log.w(TAG, "Unhandled event: $url")
            }
        }
    }
    
    private fun handleNavigateUrl(navigateUrlString: String) {
        val resolved = UrlUtils.resolveUrl(navigateUrlString)
        if (resolved != null) {
            handleOAuthUrl(Uri.parse(resolved))
        } else {
            Log.e(TAG, "Failed to parse OAuth URL after decoding attempts: $navigateUrlString")
        }
    }
    
    private fun initInjectJavaScript() {
        val tokenString = params.token ?: "null"
        val connectorId = params.config.connectorId
        val connectionId = params.config.connectionId ?: "null"
        val institution = params.config.institution ?: "null"

        val script = """
            const options = {
            source: 'quiltt',
            type: 'Options',
            token: '$tokenString',
            connectorId: '$connectorId',
            connectionId: '$connectionId',
            institution: '$institution',
            };
            const compactedOptions = Object.keys(options).reduce((acc, key) => {
            if (options[key] !== 'null') {
                acc[key] = options[key];
            }
            return acc;
            }, {});
            window.postMessage(compactedOptions);
        """

        params.webView.evaluateJavascript(script, null)
    }

    private fun clearLocalStorage() {
        val script = "localStorage.clear();"
        params.webView.evaluateJavascript(script, null)
    }

    private fun shouldRender(url: Uri): Boolean {
        if (isQuilttEvent(url)) {
            return false
        }
        return true
    }

    fun handleOAuthUrl(oauthUrl: Uri) {
        // Check if URL uses HTTPS scheme using the Uri's scheme property
        if (oauthUrl.scheme?.lowercase() != "https") {
            Log.w(TAG, "Skipping non-HTTPS URL: $oauthUrl")
            return
        }
        
        // Open the URL in the system browser. We intentionally skip
        // `Intent.resolveActivity()` as a preflight — on Android 11+ it is
        // subject to package-visibility filtering and can return null even when
        // a browser is installed. `startActivity` throws
        // `ActivityNotFoundException` if nothing can handle the intent.
        try {
            val intent = Intent(Intent.ACTION_VIEW, oauthUrl)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            params.context.startActivity(intent)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to open URL in browser: $oauthUrl", error)
            fireOAuthFailure()
        }
    }

    fun fireOAuthFailure() {
        val metadata = ConnectorSDKCallbackMetadata(
            connectorId = params.config.connectorId,
            profileId = null,
            connectionId = null,
        )
        params.onEvent?.invoke(ConnectorSDKEventType.ExitError, metadata)
        params.onExit?.invoke(ConnectorSDKEventType.ExitError, metadata)
        params.onExitError?.invoke(metadata)
    }

    private fun isQuilttEvent(url: Uri): Boolean {
        return url.toString().startsWith("quilttconnector://")
    }
}