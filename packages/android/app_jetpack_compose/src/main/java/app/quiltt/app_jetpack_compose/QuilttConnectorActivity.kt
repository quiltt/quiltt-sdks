package app.quiltt.app_jetpack_compose

import android.app.Activity
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.viewinterop.AndroidView
import app.quiltt.connector.QuilttConnector
import app.quiltt.connector.QuilttConnectorConnectConfiguration

class QuilttConnectorActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "<CONNECTOR_ID>",
            appLauncherUrl = "<YOUR_HTTP_APP_LINK")
        val token = "<ACCESS_TOKEN>"
        setContent {
            QuilttConnectorContent(config = config, token = token)
        }
    }
}

@Composable
fun QuilttConnectorContent(config: QuilttConnectorConnectConfiguration, token: String? = null) {
    val context = LocalContext.current
    val quilttConnector = QuilttConnector(context)
    if (token != null) {
        quilttConnector.authenticate(token)
    }
    val connectorWebView = quilttConnector.connect(
        config = config,
        onEvent = { eventType, metadata ->
            println("Event: $eventType")
            println("Metadata: $metadata")
        },
        onExit = { eventType, metadata ->
            println("Event: $eventType")
            println("Metadata: $metadata")
        },
        onExitSuccess = { metadata ->
            println("Exit success!")
            println("Metadata: $metadata")
            Toast.makeText(context, metadata.connectionId, Toast.LENGTH_LONG).show()
            if (context is Activity) {
                context.finish()
            }
        },
        onExitAbort = { metadata ->
            println("Exit abort!")
            println("Metadata: $metadata")
            if (context is Activity) {
                context.finish()
            }
        },
        onExitError = { metadata ->
            println("Exit error!")
            println("Metadata: $metadata")
            if (context is Activity) {
                context.finish()
            }
        })
    AndroidView(factory = { connectorWebView } )
}

@Preview(showBackground = true)
@Composable
fun QuilttConnectorPreview() {
    QuilttConnectorContent(
        config = QuilttConnectorConnectConfiguration(
            connectorId = "<CONNECTOR_ID>",
            appLauncherUrl = "<YOUR_HTTP_APP_LINK>"
        )
    )
}