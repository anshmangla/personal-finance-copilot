import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'api_config.dart';
import 'auth_service.dart';

class ExportService {
  static String get baseUrl => ApiConfig.baseUrl;

  static Future<void> _downloadAndOpen(String endpoint, String filename) async {
    final token = AuthService().token;
    if (token == null) throw Exception('Not authenticated');

    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.get(url, headers: {
      'Authorization': 'Bearer $token',
    });

    if (response.statusCode == 200) {
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/$filename';
      final file = File(filePath);
      await file.writeAsBytes(response.bodyBytes);
      
      final result = await OpenFilex.open(filePath);
      if (result.type != ResultType.done) {
        throw Exception('Could not open file: ${result.message}');
      }
    } else {
      throw Exception('Failed to download file: ${response.statusCode}');
    }
  }

  static Future<void> exportCsv() async {
    await _downloadAndOpen('/export/csv', 'finance_export.csv');
  }

  static Future<void> exportPdf() async {
    await _downloadAndOpen('/export/pdf', 'finance_export.pdf');
  }
}
