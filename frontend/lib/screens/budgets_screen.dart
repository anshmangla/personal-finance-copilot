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
  List<String> _goals = [];
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

        // Extract goals
        final rawGoals = (data['goals'] as List<dynamic>?) ?? [];
        final newGoals = rawGoals.map((g) => g.toString()).toList();

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
          _goals = newGoals;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _deleteGoal(int index) async {
    try {
      final res = await http.delete(Uri.parse('${ApiConfig.baseUrl}/delete_goal/$index'));
      if (res.statusCode == 200) {
        _fetchBudgetsAndSummary();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showAddChoiceSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Colors.blueAccent,
                    child: Icon(Icons.pie_chart, color: Colors.white),
                  ),
                  title: const Text('Set Category Budget', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Set a maximum monthly limit for a category'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showSetBudgetDialog();
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Colors.teal,
                    child: Icon(Icons.flag, color: Colors.white),
                  ),
                  title: const Text('Add Savings Goal', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Set a personal financial target or milestone'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showAddGoalDialog();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
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
        },
      ),
    );
  }

  void _showAddGoalDialog() {
    final goalCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Financial Goal'),
        content: TextField(
          controller: goalCtrl,
          decoration: const InputDecoration(
            labelText: 'Goal description',
            hintText: 'e.g. Save ₹20,000 for emergency fund',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final text = goalCtrl.text.trim();
              if (text.isEmpty) return;

              Navigator.pop(ctx);
              await http.post(
                Uri.parse('${ApiConfig.baseUrl}/add_goal'),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({'goal': text}),
              );
              _fetchBudgetsAndSummary();
            },
            child: const Text('Add Goal'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final currentMonthStr = DateTime.now().toString().substring(0, 7);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budgets & Goals', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchBudgetsAndSummary,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _showAddChoiceSheet,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchBudgetsAndSummary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Monthly Category Budgets Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Monthly Budgets ($currentMonthStr)',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (_budgets.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Text('No budgets set yet. Tap + to set a monthly limit.',
                        style: TextStyle(color: Colors.grey)),
                  ),
                )
              else ...[
                for (var entry in _budgets.entries)
                  BudgetProgressBar(
                    category: entry.key,
                    spent: _spent[entry.key] ?? 0.0,
                    limit: entry.value,
                  ),
                const SizedBox(height: 16),
              ],

              const Divider(height: 32, thickness: 1.2),

              // Financial & Savings Goals Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Financial Goals',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  TextButton.icon(
                    onPressed: _showAddGoalDialog,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Goal'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_goals.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: const [
                      Icon(Icons.flag_outlined, size: 40, color: Colors.grey),
                      SizedBox(height: 8),
                      Text(
                        'No goals added yet.',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Ask the AI Assistant or tap "+ Add Goal" above!',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _goals.length,
                  itemBuilder: (context, index) {
                    final goal = _goals[index];
                    return Card(
                      elevation: 1.5,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.teal,
                          child: Icon(Icons.flag, color: Colors.white, size: 20),
                        ),
                        title: Text(
                          goal,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.check_circle_outline, color: Colors.grey),
                          tooltip: 'Mark Completed',
                          onPressed: () => _deleteGoal(index),
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
