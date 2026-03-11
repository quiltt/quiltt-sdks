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
    
    /**
     * Helper function to handle URL parsing and OAuth redirect for Navigate events
     */
    private fun handleNavigateUrl(navigateUrlString: String) {
        // Handle potential encoding issues - Match iOS logic exactly
        if (UrlUtils.isEncoded(navigateUrlString)) {
            val decodedUrl = Uri.decode(navigateUrlString)
            parseAndHandleOAuthUrl(decodedUrl) { 
                Log.w(TAG, "Failed to parse decoded URL, trying original")
                parseAndHandleOAuthUrl(navigateUrlString) {
                    Log.e(TAG, "Failed to parse both decoded and original URL: $navigateUrlString")
                }
            }
        } else {
            parseAndHandleOAuthUrl(navigateUrlString) {
                Log.e(TAG, "Failed to parse URL: $navigateUrlString")
            }
        }
    }
    
    /**
     * Helper function to parse URL string and handle OAuth redirect with error callback
     */
    private fun parseAndHandleOAuthUrl(urlString: String, onError: () -> Unit) {
        try {
            val navigateUri = Uri.parse(urlString)
            handleOAuthUrl(navigateUri)
        } catch (error: Exception) {
            Log.e(TAG, "URL parsing failed", error)
            onError()
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

    private val allowedListUrl = listOf(
        "quiltt.app",
        "quiltt.dev",
        "moneydesktop.com",
        "cdn.plaid.com",
        "finicity.com",
    )

    private fun shouldRender(url: Uri): Boolean {
        if (isQuilttEvent(url)) {
            return false
        }
        for (allowedUrl in allowedListUrl) {
            if (url.toString().contains(allowedUrl)) {
                return true
            }
        }
        return false
    }

    private fun handleOAuthUrl(oauthUrl: Uri) {
        val urlString = oauthUrl.toString()
        
        // Check if URL uses HTTPS scheme (case-insensitive)
        // Note: We use string checking instead of Uri.scheme because encoded URLs 
        // like "https%3A%2F%2F..." would have scheme=null after Uri.parse()
        if (!urlString.startsWith("https://", ignoreCase = true)) {
            Log.w(TAG, "Skipping non-HTTPS URL: $oauthUrl")
            return
        }
        
        // Normalize the URL encoding to prevent double-encoding issues
        val normalizedUrl = UrlUtils.normalizeUrlEncoding(urlString)
        
        // Open the URL in the system browser
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(normalizedUrl))
            params.context.startActivity(intent)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to open normalized URL in browser: $normalizedUrl", error)
            // Fallback to original URL if normalization creates an invalid URL
            try {
                val intent = Intent(Intent.ACTION_VIEW, oauthUrl)
                params.context.startActivity(intent)
            } catch (fallbackError: Exception) {
                Log.e(TAG, "Failed to open original URL in browser: $oauthUrl", fallbackError)
            }
        }
    }

    private fun isQuilttEvent(url: Uri): Boolean {
        return url.toString().startsWith("quilttconnector://")
    }
}