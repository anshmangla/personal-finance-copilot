import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../widgets/budget_progress_bar.dart';
import '../services/api_config.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});

  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  Map<String, double> _budgets = {};
  Map<String, double> _spent = {};
  bool _isLoading = true;

  final List<String> _categories = [
    'Food', 'Shopping', 'Transport', 'Bills',
    'Entertainment', 'Travel', 'Other'
  ];

  @override
  void initState() {
    super.initState();
    _fetchBudgetsAndSummary();
  }

  Future<void> _fetchBudgetsAndSummary() async {
    setState(() => _isLoading = true);
    try {
      final summaryRes = await http.get(Uri.parse('${ApiConfig.baseUrl}/summary'));
      if (summaryRes.statusCode == 200) {
        final data = jsonDecode(summaryRes.body)['data'];
        
        final budgetsMap = (data['budgets'] as Map<String, dynamic>?) ?? {};
        final newBudgets = <String, double>{};
        budgetsMap.forEach((k, v) => newBudgets[k] = (v as num).toDouble());

        // Extract current month spend
        final txs = (data['transactions'] as List<dynamic>?) ?? [];
        final currentMonth = DateTime.now().toString().substring(0, 7);
        final newSpent = <String, double>{};
        
        for (var tx in txs) {
          final date = tx['date'] ?? '';
          if (date.startsWith(currentMonth)) {
            final type = (tx['type'] ?? 'debit').toString().toLowerCase();
            if (type != 'credit') {
              final cat = tx['category'] ?? 'Other';
              final amt = (tx['amount'] as num?)?.toDouble() ?? 0.0;
              newSpent[cat] = (newSpent[cat] ?? 0.0) + amt;
            }
          }
        }

        setState(() {
          _budgets = newBudgets;
          _spent = newSpent;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _showSetBudgetDialog() {
    String selectedCat = _categories.first;
    final limitCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setStateDialog) {
          return AlertDialog(
            title: const Text('Set Budget Limit'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: selectedCat,
                  items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setStateDialog(() => selectedCat = v!),
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: limitCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Monthly Limit (₹)'),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  final limit = double.tryParse(limitCtrl.text);
                  if (limit == null || limit <= 0) return;
                  
                  Navigator.pop(ctx);
                  await http.post(
                    Uri.parse('${ApiConfig.baseUrl}/set_budget'),
                    headers: {'Content-Type': 'application/json'},
                    body: jsonEncode({'category': selectedCat, 'limit': limit}),
                  );
                  _fetchBudgetsAndSummary();
                },
                child: const Text('Save'),
              ),
            ],
          );
        }
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final currentMonthStr = DateTime.now().toString().substring(0, 7);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budgets & Goals', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showSetBudgetDialog),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Monthly Progress ($currentMonthStr)', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            if (_budgets.isEmpty)
              const Center(child: Text('No budgets set. Tap + to set a limit.'))
            else
              Expanded(
                child: ListView.builder(
                  itemCount: _budgets.length,
                  itemBuilder: (context, index) {
                    final cat = _budgets.keys.elementAt(index);
                    final limit = _budgets[cat]!;
                    final spent = _spent[cat] ?? 0.0;
                    return BudgetProgressBar(category: cat, spent: spent, limit: limit);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
