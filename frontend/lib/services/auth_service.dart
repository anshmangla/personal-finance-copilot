import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final _storage = const FlutterSecureStorage();
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: ApiConfig.googleWebClientId.isNotEmpty ? ApiConfig.googleWebClientId : null,
    scopes: ['email', 'profile'],
  );

  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _token != null;
  bool get isLoading => _isLoading;

  /// Loads token on app startup and validates with backend
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final savedToken = await _storage.read(key: 'jwt_token');
      final savedUserJson = await _storage.read(key: 'user_profile');

      if (savedToken != null) {
        _token = savedToken;
        if (savedUserJson != null) {
          _user = jsonDecode(savedUserJson);
        }

        // Validate token with backend /auth/me
        try {
          final res = await http.get(
            Uri.parse('${ApiConfig.baseUrl}/auth/me'),
            headers: {'Authorization': 'Bearer $_token'},
          ).timeout(const Duration(seconds: 10));

          if (res.statusCode == 200) {
            final data = jsonDecode(res.body);
            _user = data['user'];
            await _storage.write(key: 'user_profile', value: jsonEncode(_user));
          } else if (res.statusCode == 401) {
            // Token expired or invalid
            await signOut();
          }
        } catch (_) {
          // If offline or network issue, proceed with cached credentials
        }
      }
    } catch (e) {
      debugPrint('Auth init error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign In with Google
  Future<bool> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        return false; // User canceled sign-in
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('Failed to obtain Google ID token');
      }

      // Exchange id_token with FastAPI backend
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'id_token': idToken}),
      ).timeout(const Duration(seconds: 40));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['access_token'];
        _user = data['user'];

        await _storage.write(key: 'jwt_token', value: _token);
        await _storage.write(key: 'user_profile', value: jsonEncode(_user));

        notifyListeners();
        return true;
      } else {
        throw Exception('Backend authentication failed (${response.statusCode}): ${response.body}');
      }
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Optional Dev Sign-In (for quick testing without Google credentials)
  Future<bool> signInAsDev({String email = "test@financecopilot.com", String name = "Test User"}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/dev_login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'name': name}),
      ).timeout(const Duration(seconds: 40));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['access_token'];
        _user = data['user'];

        await _storage.write(key: 'jwt_token', value: _token);
        await _storage.write(key: 'user_profile', value: jsonEncode(_user));

        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Dev Sign-In error: $e');
      return false;
    }
  }

  /// Sign Out
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}

    await _storage.deleteAll();
    _token = null;
    _user = null;
    notifyListeners();
  }
}
