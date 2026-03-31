/// Metadata included with every Connector SDK callback event.
class ConnectorSDKCallbackMetadata {
  /// The ID of the connector that triggered the event.
  String connectorId;

  /// The connection ID associated with the event, if available.
  String? connectionId;

  /// The profile ID associated with the event, if available.
  String? profileId;

  /// Creates a [ConnectorSDKCallbackMetadata] instance.
  ConnectorSDKCallbackMetadata({
    required this.connectorId,
    this.connectionId,
    this.profileId,
  });
}

/// Callback payload delivered for intermediate Connector events.
class ConnectorSDKOnEventCallback {
  /// The event type identifier (e.g. `'load'`, `'navigate'`).
  String type;

  /// Metadata associated with the event.
  ConnectorSDKCallbackMetadata eventMetadata;

  /// Creates a [ConnectorSDKOnEventCallback] instance.
  ConnectorSDKOnEventCallback({
    required this.type,
    required this.eventMetadata,
  });
}

/// Callback payload delivered when the Connector exits via an event.
class ConnectorSDKOnEventExitCallback {
  /// The exit event type identifier.
  String type;

  /// Metadata associated with the exit event.
  ConnectorSDKCallbackMetadata eventMetadata;

  /// Creates a [ConnectorSDKOnEventExitCallback] instance.
  ConnectorSDKOnEventExitCallback({
    required this.type,
    required this.eventMetadata,
  });
}

/// Callback payload delivered when the Connector exits after a successful connection.
class ConnectorSDKOnExitSuccessCallback {
  /// Metadata for the successful connection.
  ConnectorSDKCallbackMetadata eventMetadata;

  /// Creates a [ConnectorSDKOnExitSuccessCallback] instance.
  ConnectorSDKOnExitSuccessCallback({required this.eventMetadata});
}

/// Callback payload delivered when the user aborts the Connector flow.
class ConnectorSDKOnExitAbortCallback {
  /// Metadata for the aborted session.
  ConnectorSDKCallbackMetadata eventMetadata;

  /// Creates a [ConnectorSDKOnExitAbortCallback] instance.
  ConnectorSDKOnExitAbortCallback({required this.eventMetadata});
}

/// Callback payload delivered when the Connector exits with an error.
class ConnectorSDKOnExitErrorCallback {
  /// Metadata for the errored session.
  ConnectorSDKCallbackMetadata eventMetadata;

  /// Creates a [ConnectorSDKOnExitErrorCallback] instance.
  ConnectorSDKOnExitErrorCallback({required this.eventMetadata});
}
