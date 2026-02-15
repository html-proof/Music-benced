import 'dart:async';
import 'dart:math';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

enum NetworkQuality { low, medium, high }

class NetworkQualityService {
  static final NetworkQualityService _instance = NetworkQualityService._internal();
  factory NetworkQualityService() => _instance;
  NetworkQualityService._internal();

  NetworkQuality _currentQuality = NetworkQuality.high;
  StreamController<NetworkQuality>? _qualityController;
  Timer? _speedCheckTimer;
  
  NetworkQuality get currentQuality => _currentQuality;
  Stream<NetworkQuality>? get qualityStream => _qualityController?.stream;

  void initialize() {
    _qualityController = StreamController<NetworkQuality>.broadcast();
    
    // Monitor network changes
    Connectivity().onConnectivityChanged.listen(_handleConnectivityChange);
    
    // Check speed periodically every 30 seconds
    _speedCheckTimer = Timer.periodic(
      const Duration(seconds: 30), 
      (_) => _checkNetworkSpeed(),
    );
    
    // Initial check
    _checkNetworkSpeed();
  }

  void _handleConnectivityChange(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.wifi:
        // WiFi - check actual speed before assuming high quality
        _checkNetworkSpeed();
        break;
      case ConnectivityResult.mobile:
      case ConnectivityResult.ethernet:
        // Mobile/Ethernet - check speed
        _checkNetworkSpeed();
        break;
      case ConnectivityResult.none:
        _updateQuality(NetworkQuality.low);
        break;
      default:
        _checkNetworkSpeed();
    }
  }

  Future<void> _checkNetworkSpeed() async {
    try {
      final speed = await _measureDownloadSpeed();
      
      // Speed thresholds (kbps)
      if (speed < 150) {
        _updateQuality(NetworkQuality.low);      // < 150 kbps
      } else if (speed < 500) {
        _updateQuality(NetworkQuality.medium);   // 150-500 kbps
      } else {
        _updateQuality(NetworkQuality.high);     // > 500 kbps
      }
    } catch (e) {
      // If speed check fails, assume low quality to be safe
      _updateQuality(NetworkQuality.low);
    }
  }

  Future<double> _measureDownloadSpeed() async {
    const testUrl = 'https://data-fetch-production.up.railway.app/health';
    const testSize = 1024; // bytes to download for test
    
    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 10),
    ));

    final stopwatch = Stopwatch()..start();
    
    try {
      // Download small test file or make API call
      await dio.get(
        testUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      
      stopwatch.stop();
      final durationMs = stopwatch.elapsedMilliseconds;
      
      if (durationMs == 0) return double.infinity;
      
      // Calculate speed in kbps (kilobits per second)
      // Downloaded ~1KB, convert to kilobits and calculate per second
      final speedKbps = (testSize * 8) / (durationMs / 1000) / 1024;
      
      return speedKbps;
    } catch (e) {
      // If we can't even connect, return very low speed
      return 0;
    }
  }

  void _updateQuality(NetworkQuality newQuality) {
    if (_currentQuality != newQuality) {
      _currentQuality = newQuality;
      _qualityController?.add(newQuality);
    }
  }

  String getQualityString() {
    switch (_currentQuality) {
      case NetworkQuality.low:
        return 'low';
      case NetworkQuality.medium:
        return 'medium';
      case NetworkQuality.high:
        return 'high';
    }
  }

  void dispose() {
    _speedCheckTimer?.cancel();
    _qualityController?.close();
  }
}
