import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Base URL from the user request
const String kBaseUrl = 'https://data-fetch-production.up.railway.app';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  static String get baseUrl => kBaseUrl;
  final Dio _dio;

  ApiService()
      : _dio = Dio(BaseOptions(
          baseUrl: kBaseUrl,
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 90),
          sendTimeout: const Duration(seconds: 30),
        ));

  Dio get client => _dio;

  void setAuthToken(String token) {
    if (token.isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  String _handleError(DioException e) {
    if (e.response != null) {
      return 'Error: ${e.response?.statusCode} - ${e.response?.statusMessage}';
    } else {
      return 'Connection Error: ${e.message}';
    }
  }
}
