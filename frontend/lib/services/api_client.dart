import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';
import 'auth_service.dart';

class ApiClient {
  static Map<String, String> _buildHeaders([Map<String, String>? extraHeaders]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    final token = AuthService().token;
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (extraHeaders != null) {
      headers.addAll(extraHeaders);
    }
    return headers;
  }

  static Uri _uri(String path) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('${ApiConfig.baseUrl}$cleanPath');
  }

  static Future<http.Response> get(String path, {Map<String, String>? headers}) async {
    final response = await http
        .get(_uri(path), headers: _buildHeaders(headers))
        .timeout(const Duration(seconds: 45));
    _handleAuthErrors(response);
    return response;
  }

  static Future<http.Response> post(String path, {dynamic body, Map<String, String>? headers}) async {
    final response = await http
        .post(
          _uri(path),
          headers: _buildHeaders(headers),
          body: body != null ? (body is String ? body : jsonEncode(body)) : null,
        )
        .timeout(const Duration(seconds: 60));
    _handleAuthErrors(response);
    return response;
  }

  static Future<http.Response> put(String path, {dynamic body, Map<String, String>? headers}) async {
    final response = await http
        .put(
          _uri(path),
          headers: _buildHeaders(headers),
          body: body != null ? (body is String ? body : jsonEncode(body)) : null,
        )
        .timeout(const Duration(seconds: 45));
    _handleAuthErrors(response);
    return response;
  }

  static Future<http.Response> delete(String path, {Map<String, String>? headers}) async {
    final response = await http
        .delete(_uri(path), headers: _buildHeaders(headers))
        .timeout(const Duration(seconds: 45));
    _handleAuthErrors(response);
    return response;
  }

  static void _handleAuthErrors(http.Response response) {
    if (response.statusCode == 401) {
      AuthService().signOut();
    }
  }
}
