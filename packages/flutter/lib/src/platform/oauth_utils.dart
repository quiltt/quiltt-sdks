import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher_string.dart';

import '../../event.dart';
import '../../url_utils.dart';

/// Handles opening an OAuth URL in an external browser.
///
/// Wraps the launch sequence in a try/catch so that platform-channel failures
/// (e.g. from [launchUrlString]) are handled gracefully and fire
/// [fireOAuthFailure] instead of propagating.
Future<void> handleOAuthUrl(
  String oauthUrl,
  String connectorId, {
  void Function(ConnectorSDKOnEventCallback event)? onEvent,
  void Function(ConnectorSDKOnEventExitCallback event)? onExit,
  void Function(ConnectorSDKOnExitErrorCallback event)? onExitError,
}) async {
  try {
    // Normalization can throw on malformed escape sequences (e.g. "%ZZ"), so
    // it must run inside this try to still report failure via fireOAuthFailure.
    final normalizedUrl = URLUtils.normalizeUrlEncoding(oauthUrl);

    // Attempt to open the URL directly. We intentionally skip
    // `canLaunchUrlString()` as a preflight — it is unreliable on Android 11+
    // under package-visibility filtering, whereas `launchUrlString` itself
    // reports success/failure authoritatively.
    final launched = await launchUrlString(
      normalizedUrl,
      mode: LaunchMode.externalApplication,
    );

    if (!launched) {
      debugPrint('Quiltt: Failed to open OAuth URL: $normalizedUrl');
      fireOAuthFailure(
        connectorId,
        onEvent: onEvent,
        onExit: onExit,
        onExitError: onExitError,
      );
    }
  } catch (e) {
    debugPrint('Quiltt: Error opening OAuth URL: $oauthUrl – $e');
    fireOAuthFailure(
      connectorId,
      onEvent: onEvent,
      onExit: onExit,
      onExitError: onExitError,
    );
  }
}

/// Fires exit-error callbacks to signal an OAuth failure to the host app.
void fireOAuthFailure(
  String connectorId, {
  void Function(ConnectorSDKOnEventCallback event)? onEvent,
  void Function(ConnectorSDKOnEventExitCallback event)? onExit,
  void Function(ConnectorSDKOnExitErrorCallback event)? onExitError,
}) {
  final metadata = ConnectorSDKCallbackMetadata(connectorId: connectorId);
  onEvent?.call(
    ConnectorSDKOnEventCallback(
      type: ConnectorSDKEventType.exitErrored,
      eventMetadata: metadata,
    ),
  );
  onExit?.call(
    ConnectorSDKOnEventExitCallback(
      type: ConnectorSDKEventType.exitErrored,
      eventMetadata: metadata,
    ),
  );
  onExitError?.call(ConnectorSDKOnExitErrorCallback(eventMetadata: metadata));
}
