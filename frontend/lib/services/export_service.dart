import 'package:url_launcher/url_launcher.dart';
import 'api_config.dart';
import 'auth_service.dart';

class ExportService {
  static String get baseUrl => ApiConfig.baseUrl;

  static Future<void> exportCsv() async {
    final token = AuthService().token;
    final tokenParam = token != null ? '?token=$token' : '';
    final url = Uri.parse('$baseUrl/export/csv$tokenParam');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }

  static Future<void> exportPdf() async {
    final token = AuthService().token;
    final tokenParam = token != null ? '?token=$token' : '';
    final url = Uri.parse('$baseUrl/export/pdf$tokenParam');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }
}
