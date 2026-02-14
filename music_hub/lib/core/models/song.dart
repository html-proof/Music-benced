class Song {
  final String id;
  final String title;
  final String artist;
  final String thumbnail;
  final String duration;
  final String? localAudioPath;
  final String? localImagePath;

  Song({
    required this.id,
    required this.title,
    required this.artist,
    required this.thumbnail,
    required this.duration,
    this.localAudioPath,
    this.localImagePath,
  });

  factory Song.fromJson(Map<String, dynamic> json) {
    return Song(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Unknown Title',
      artist: json['uploader'] ?? 'Unknown Artist',
      thumbnail: json['thumbnail'] ?? '',
      duration: json['duration'] != null ? _formatDuration(json['duration']) : '',
      localAudioPath: json['localAudioPath'],
      localImagePath: json['localImagePath'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'uploader': artist,
      'thumbnail': thumbnail,
      'duration': duration,
      'localAudioPath': localAudioPath,
      'localImagePath': localImagePath,
    };
  }

  static String _formatDuration(dynamic duration) {
    if (duration is int) {
      final minutes = duration ~/ 60;
      final seconds = duration % 60;
      return '$minutes:${seconds.toString().padLeft(2, '0')}';
    }
    return duration.toString();
  }
}

