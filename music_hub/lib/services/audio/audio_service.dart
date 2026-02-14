import 'package:audio_service/audio_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:music_hub/services/audio/audio_handler.dart';

final audioHandlerProvider = Provider<AudioHandler>((ref) {
  throw UnimplementedError('Provider was not overridden');
});

// Initialize in main.dart
Future<AudioHandler> initAudioService() async {
  return await AudioService.init(
    builder: () => AudioPlayerHandler(),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.musichub.channel.audio',
      androidNotificationChannelName: 'Music Hub Audio',
      androidNotificationOngoing: true,
    ),
  );
}
