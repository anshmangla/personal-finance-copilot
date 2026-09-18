import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:fl_chart/fl_chart.dart';
import '../services/export_service.dart';
import '../services/api_config.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? summaryData;
  bool isLoading = true;
  String errorMsg = '';
  String? _selectedMonth; // e.g. "2026-09"
  bool _filterBySelectedMonth = false;

  final List<String> _expenseCategories = [
    'Food', 'Shopping', 'Transport', 'Bills',
    'Entertainment', 'Transfer', 'Travel', 'Other'
  ];

  final List<String> _incomeCategories = [
    'Salary', 'Freelance', 'Investment', 'Gift',
    'Refund', 'Transfer', 'Other'
  ];

  @override
  void initState() {
    super.initState();
    fetchSummary();
  }

  Future<void> fetchSummary() async {
    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/summary'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body)['data'] as Map<String, dynamic>;
        final txs = (data['transactions'] as List<dynamic>?) ?? [];
        final months = _extractMonths(txs);

        setState(() {
          summaryData = data;
          isLoading = false;
          if (_selectedMonth == null || !months.contains(_selectedMonth)) {
            _selectedMonth = months.isNotEmpty ? months.first : null;
          }
        });
      } else {
        setState(() {
          errorMsg = 'Failed to load summary';
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        errorMsg = 'Error: $e';
        isLoading = false;
      });
    }
  }

  List<String> _extractMonths(List<dynamic> txs) {
    final Set<String> months = {};
    for (final raw in txs) {
      final tx = raw as Map<String, dynamic>;
      final date = (tx['date'] ?? '').toString();
      if (date.length >= 7) {
        months.add(date.substring(0, 7));
      }
    }
    final sorted = months.toList()..sort((a, b) => b.compareTo(a));
    return sorted;
  }

  Future<void> _deleteTransaction(String txId) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/delete_transaction/$txId'),
      );
      if (response.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction deleted successfully')),
        );
        fetchSummary();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete transaction')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _showEditDialog(Map<String, dynamic> tx) async {
    final amountController =
        TextEditingController(text: (tx['amount'] ?? '').toString());
    final merchantController =
        TextEditingController(text: (tx['merchant'] ?? '').toString());
    String currentType = (tx['type'] ?? 'debit').toString().toLowerCase();
    String currentCategory = (tx['category'] ?? 'Other').toString();
    String currentDate = (tx['date'] ?? '').toString();

    List<String> validCategories =
        currentType == 'credit' ? _incomeCategories : _expenseCategories;
    if (!validCategories.contains(currentCategory)) {
      currentCategory = validCategories.last;
    }

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final isCredit = currentType == 'credit';
            final themeColor = isCredit ? Colors.teal : Colors.blue;

            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Edit Transaction', style: TextStyle(fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text('Expense')),
                            selected: currentType == 'debit',
                            selectedColor: Colors.blue.withAlpha(50),
                            onSelected: (selected) {
                              if (selected) {
                                setDialogState(() {
                                  currentType = 'debit';
                                  validCategories = _expenseCategories;
                                  currentCategory = _expenseCategories[0];
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text('Income')),
                            selected: currentType == 'credit',
                            selectedColor: Colors.teal.withAlpha(50),
                            onSelected: (selected) {
                              if (selected) {
                                setDialogState(() {
                                  currentType = 'credit';
                                  validCategories = _incomeCategories;
                                  currentCategory = _incomeCategories[0];
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Amount (₹)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: merchantController,
                      decoration: InputDecoration(
                        labelText: isCredit ? 'Payer / Source' : 'Merchant',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: currentCategory,
                      decoration: InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      items: validCategories.map((cat) {
                        return DropdownMenuItem(value: cat, child: Text(cat));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            currentCategory = val;
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themeColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () async {
                    final newAmount = double.tryParse(amountController.text.trim());
                    final newMerchant = merchantController.text.trim();
                    final messenger = ScaffoldMessenger.of(context);
                    if (newAmount == null || newAmount <= 0 || newMerchant.isEmpty) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Please fill valid details')),
                      );
                      return;
                    }
                    Navigator.pop(dialogContext);

                    try {
                      final response = await http.put(
                        Uri.parse('${ApiConfig.baseUrl}/edit_transaction'),
                        headers: {'Content-Type': 'application/json'},
                        body: jsonEncode({
                          'id': tx['id'],
                          'amount': newAmount,
                          'merchant': newMerchant,
                          'category': currentCategory,
                          'type': currentType,
                          'date': currentDate,
                        }),
                      );
                      if (response.statusCode == 200) {
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Transaction updated!')),
                        );
                        fetchSummary();
                      } else {
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Failed to update transaction')),
                        );
                      }
                    } catch (e) {
                      messenger.showSnackBar(
                        SnackBar(content: Text('Error: $e')),
                      );
                    }
                  },
                  child: const Text('Save', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showTransactionActions(Map<String, dynamic> tx) {
    final merchant = (tx['merchant'] ?? 'Unknown').toString();
    final isCredit = (tx['type'] ?? 'debit').toString().toLowerCase() == 'credit';
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bottomSheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  merchant,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  '${isCredit ? "+₹" : "-₹"}${amount.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isCredit ? Colors.teal : Colors.redAccent,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: const Icon(Icons.edit, color: Colors.blue),
                  title: const Text('Edit Transaction', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(bottomSheetContext);
                    _showEditDialog(tx);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.delete, color: Colors.redAccent),
                  title: const Text('Delete Transaction', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.redAccent)),
                  onTap: () {
                    Navigator.pop(bottomSheetContext);
                    showDialog(
                      context: context,
                      builder: (confirmContext) {
                        return AlertDialog(
                          title: const Text('Delete Transaction?'),
                          content: Text('Are you sure you want to delete this transaction for ₹${amount.toStringAsFixed(2)}?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(confirmContext),
                              child: const Text('Cancel'),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(confirmContext);
                                _deleteTransaction(tx['id'].toString());
                              },
                              child: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
                            ),
                          ],
                        );
                      },
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showMonthPicker(List<String> months) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Select Month', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: months.length,
                  itemBuilder: (context, index) {
                    final m = months[index];
                    final isSelected = m == _selectedMonth;
                    return ListTile(
                      title: Text(
                        _formatMonthYear(m),
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? Colors.blue : Colors.black87,
                        ),
                      ),
                      trailing: isSelected ? const Icon(Icons.check, color: Colors.blue) : null,
                      onTap: () {
                        setState(() {
                          _selectedMonth = m;
                        });
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (errorMsg.isNotEmpty) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(errorMsg),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    isLoading = true;
                    errorMsg = '';
                  });
                  fetchSummary();
                },
                child: const Text('Retry'),
              )
            ],
          ),
        ),
      );
    }

    final allTransactions = (summaryData?['transactions'] as List<dynamic>?) ?? [];
    final availableMonths = _extractMonths(allTransactions);

    // Compute month-specific data
    double monthIncome = 0;
    double monthExpense = 0;
    final Map<String, double> monthCategoryBreakdown = {};

    if (_selectedMonth != null) {
      for (final raw in allTransactions) {
        final tx = raw as Map<String, dynamic>;
        final date = (tx['date'] ?? '').toString();
        if (date.startsWith(_selectedMonth!)) {
          final amt = (tx['amount'] as num?)?.toDouble() ?? 0.0;
          final isCredit = (tx['type'] ?? 'debit').toString().toLowerCase() == 'credit';
          if (isCredit) {
            monthIncome += amt;
          } else {
            monthExpense += amt;
            final cat = (tx['category'] ?? 'Other').toString();
            monthCategoryBreakdown[cat] = (monthCategoryBreakdown[cat] ?? 0.0) + amt;
          }
        }
      }
    }
    final monthBalance = monthIncome - monthExpense;

    // Group transactions by month (GPay style)
    final Map<String, List<Map<String, dynamic>>> groupedTransactions = {};
    for (final raw in allTransactions) {
      final tx = raw as Map<String, dynamic>;
      final date = (tx['date'] ?? '').toString();
      final mKey = date.length >= 7 ? date.substring(0, 7) : 'Other';

      if (!_filterBySelectedMonth || mKey == _selectedMonth) {
        groupedTransactions.putIfAbsent(mKey, () => []).add(tx);
      }
    }

    final currentMonthIndex = _selectedMonth != null ? availableMonths.indexOf(_selectedMonth!) : -1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.file_download),
            onSelected: (value) async {
              try {
                if (value == 'csv') {
                  await ExportService.exportCsv();
                } else if (value == 'pdf') {
                  await ExportService.exportPdf();
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export failed: $e')));
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'csv', child: Text('Export as CSV')),
              const PopupMenuItem(value: 'pdf', child: Text('Export as PDF')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                isLoading = true;
              });
              fetchSummary();
            },
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: fetchSummary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Upcoming Bills Banner
                if ((summaryData?['upcoming_reminders'] as List?)?.isNotEmpty ?? false)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange.shade300),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Colors.orange.shade800),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'You have ${(summaryData?['upcoming_reminders'] as List).length} upcoming bill(s) due soon.',
                            style: TextStyle(color: Colors.orange.shade900, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Month Selector Bar
                if (availableMonths.isNotEmpty && _selectedMonth != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left, size: 28),
                          color: currentMonthIndex < availableMonths.length - 1 ? Colors.black87 : Colors.grey.shade400,
                          onPressed: currentMonthIndex < availableMonths.length - 1
                              ? () {
                                  setState(() {
                                    _selectedMonth = availableMonths[currentMonthIndex + 1];
                                  });
                                }
                              : null,
                        ),
                        InkWell(
                          onTap: () => _showMonthPicker(availableMonths),
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_month, size: 18, color: Colors.blueAccent),
                                const SizedBox(width: 8),
                                Text(
                                  _formatMonthYear(_selectedMonth!),
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const Icon(Icons.arrow_drop_down, color: Colors.grey),
                              ],
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right, size: 28),
                          color: currentMonthIndex > 0 ? Colors.black87 : Colors.grey.shade400,
                          onPressed: currentMonthIndex > 0
                              ? () {
                                  setState(() {
                                    _selectedMonth = availableMonths[currentMonthIndex - 1];
                                  });
                                }
                              : null,
                        ),
                      ],
                    ),
                  ),

                // Month-wise Balance Card
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
                    child: Column(
                      children: [
                        Text(
                          _selectedMonth != null
                              ? '${_formatMonthYear(_selectedMonth!)} Balance'
                              : 'Net Balance',
                          style: const TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${monthBalance >= 0 ? '' : '-'}₹${monthBalance.abs().toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                            color: monthBalance >= 0 ? Colors.black87 : Colors.redAccent,
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Divider(height: 1),
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: Colors.teal.withAlpha(30),
                                  child: const Icon(Icons.arrow_downward, color: Colors.teal, size: 18),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Income', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                    Text(
                                      '+₹${monthIncome.toStringAsFixed(2)}',
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.teal),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Container(height: 30, width: 1, color: Colors.grey.shade300),
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: Colors.redAccent.withAlpha(30),
                                  child: const Icon(Icons.arrow_upward, color: Colors.redAccent, size: 18),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Expense', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                    Text(
                                      '-₹${monthExpense.toStringAsFixed(2)}',
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.redAccent),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 26),

                // Month-wise Category Breakdown
                Text(
                  _selectedMonth != null
                      ? 'Expense Breakdown • ${_formatMonthYear(_selectedMonth!)}'
                      : 'Expense Breakdown',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                if (monthCategoryBreakdown.isNotEmpty)
                  SizedBox(
                    height: 220,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 2,
                        centerSpaceRadius: 45,
                        sections: monthCategoryBreakdown.entries.map((e) {
                          final color = _getCategoryColor(e.key);
                          return PieChartSectionData(
                            value: e.value,
                            title: e.key,
                            radius: 45,
                            titleStyle: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            color: color,
                          );
                        }).toList(),
                      ),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    child: Center(
                      child: Text(
                        _selectedMonth != null
                            ? 'No expenses recorded in ${_formatMonthYear(_selectedMonth!)}.'
                            : 'No expense data available.',
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ),
                  ),

                const SizedBox(height: 30),

                // Transactions Header with Filter Toggle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Transactions',
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                    ),
                    InkWell(
                      onTap: () {
                        setState(() {
                          _filterBySelectedMonth = !_filterBySelectedMonth;
                        });
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _filterBySelectedMonth ? Colors.blue.shade50 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _filterBySelectedMonth ? Colors.blue : Colors.grey.shade300,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.filter_list,
                              size: 14,
                              color: _filterBySelectedMonth ? Colors.blue : Colors.grey.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _filterBySelectedMonth ? 'Selected Month' : 'All Months',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _filterBySelectedMonth ? Colors.blue : Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // GPay Month-Wise Grouped Transactions
                if (groupedTransactions.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text('No transactions yet.', style: TextStyle(color: Colors.grey)),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: groupedTransactions.keys.length,
                    itemBuilder: (context, groupIndex) {
                      final monthKey = groupedTransactions.keys.elementAt(groupIndex);
                      final txList = groupedTransactions[monthKey]!;

                      double monthGroupExpense = 0;
                      for (final item in txList) {
                        if ((item['type'] ?? 'debit').toString().toLowerCase() != 'credit') {
                          monthGroupExpense += (item['amount'] as num?)?.toDouble() ?? 0.0;
                        }
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // GPay Style Month Banner Header
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _formatMonthYear(monthKey),
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  Text(
                                    'Total: ₹${monthGroupExpense.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Month Transactions Card
                            Card(
                              elevation: 1,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              child: ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: txList.length,
                                separatorBuilder: (context, index) => const Divider(height: 1, indent: 68),
                                itemBuilder: (context, index) {
                                  final tx = txList[index];
                                  final category = (tx['category'] ?? 'Other').toString();
                                  final merchant = (tx['merchant'] ?? 'Unknown').toString();
                                  final date = (tx['date'] ?? '').toString();
                                  final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;
                                  final isCredit = (tx['type'] ?? 'debit').toString().toLowerCase() == 'credit';

                                  final color = isCredit ? Colors.teal : _getCategoryColor(category);
                                  final icon = isCredit ? Icons.call_received : _getCategoryIcon(category);

                                  return ListTile(
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                    leading: CircleAvatar(
                                      radius: 22,
                                      backgroundColor: color.withAlpha(38),
                                      child: Icon(icon, color: color, size: 22),
                                    ),
                                    title: Text(
                                      merchant,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 15,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    subtitle: Text(
                                      '${isCredit ? "Received" : category} • ${_formatDate(date)}',
                                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          '${isCredit ? "+₹" : "-₹"}${amount.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: isCredit ? Colors.teal : Colors.black87,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Icon(Icons.chevron_right, size: 18, color: Colors.grey[400]),
                                      ],
                                    ),
                                    onTap: () => _showTransactionActions(tx),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'food':
        return Icons.restaurant;
      case 'shopping':
        return Icons.shopping_bag;
      case 'transport':
        return Icons.directions_car;
      case 'bills':
        return Icons.receipt_long;
      case 'entertainment':
        return Icons.movie;
      case 'transfer':
        return Icons.swap_horiz;
      case 'travel':
        return Icons.flight;
      default:
        return Icons.account_balance_wallet;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'food':
        return Colors.deepOrange;
      case 'shopping':
        return Colors.purple;
      case 'transport':
        return Colors.blue;
      case 'bills':
        return Colors.redAccent;
      case 'entertainment':
        return Colors.pink;
      case 'transfer':
        return Colors.teal;
      case 'travel':
        return Colors.indigo;
      default:
        return Colors.blueGrey;
    }
  }

  String _formatMonthYear(String yearMonth) {
    try {
      final parts = yearMonth.split('-');
      if (parts.length >= 2) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        final mIdx = int.parse(parts[1]) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return '${monthNames[mIdx]} ${parts[0]}';
        }
      }
    } catch (_) {}
    return yearMonth;
  }

  String _formatDate(String rawDate) {
    if (rawDate.isEmpty) return '';
    try {
      final parts = rawDate.split('-');
      if (parts.length == 3) {
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        final monthIdx = int.parse(parts[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return '${parts[2]} ${months[monthIdx]} ${parts[0]}';
        }
      }
    } catch (_) {}
    return rawDate;
  }
}
