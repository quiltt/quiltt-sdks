/// Configuration for launching the Quiltt Connector.
class QuilttConnectorConfiguration {
  /// The ID of the connector to launch.
  String connectorId;

  /// The URL used when returning from an external app (e.g. an OAuth redirect).
  String appLauncherUrl;

  /// The ID of an existing connection to reconnect to.
  String? connectionId;

  /// An optional institution hint to pre-select in the connector.
  String? institution;

  /// Creates a [QuilttConnectorConfiguration].
  QuilttConnectorConfiguration({
    required this.connectorId,
    required this.appLauncherUrl,
    this.connectionId,
    this.institution,
  });
}
