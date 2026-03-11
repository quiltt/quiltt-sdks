class QuilttConnectorConfiguration {
  String connectorId;
  String appLauncherUrl;
  String? connectionId;
  String? institution;

  QuilttConnectorConfiguration({
    required this.connectorId,
    required this.appLauncherUrl,
    this.connectionId,
    this.institution,
  });
}
