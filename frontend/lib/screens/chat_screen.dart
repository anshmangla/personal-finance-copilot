import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_client.dart';

class ChatMessage {
  final String text;
  final bool isUser;

  ChatMessage({required this.text, required this.isUser});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isTyping = false;
  bool _isLoadingHistory = true;

  final List<String> _suggestions = [
    "How much did I spend this month?",
    "What's my highest spending category?",
    "Show me upcoming bills",
    "How am I doing on my budget?",
  ];

  @override
  void initState() {
    super.initState();
    _fetchChatHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _fetchChatHistory() async {
    try {
      final response = await ApiClient.get('/chat/history');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final list = (body['data'] as List<dynamic>?) ?? [];
        final loaded = list.map((item) {
          final isUser = (item['role'] ?? 'user') == 'user';
          final content = (item['content'] ?? '').toString();
          return ChatMessage(text: content, isUser: isUser);
        }).toList();

        if (mounted) {
          setState(() {
            _messages.clear();
            _messages.addAll(loaded);
            _isLoadingHistory = false;
          });
          _scrollToBottom();
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingHistory = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching chat history: $e');
      if (mounted) {
        setState(() {
          _isLoadingHistory = false;
        });
      }
    }
  }

  Future<void> _startNewChat() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start New Chat?'),
        content: const Text(
          'This will clear the previous conversation history and reset the assistant memory.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('New Chat', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final res = await ApiClient.delete('/chat/history');
      if (res.statusCode == 200) {
        if (mounted) {
          setState(() {
            _messages.clear();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Started a fresh conversation.'),
              backgroundColor: Colors.teal,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to clear chat: $e')),
        );
      }
    }
  }

  Future<void> _sendMessage([String? textToSend]) async {
    final text = textToSend ?? _controller.text.trim();
    if (text.isEmpty) return;

    if (textToSend == null) {
      _controller.clear();
    }

    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _isTyping = true;
    });
    _scrollToBottom();

    try {
      final response = await ApiClient.post(
        '/chat',
        body: {'query': text},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: data['response'] ?? 'No response received.',
              isUser: false,
            ));
          });
          _scrollToBottom();
        }
      } else {
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: 'Server error (${response.statusCode}). Please check backend logs.',
              isUser: false,
            ));
          });
          _scrollToBottom();
        }
      }
    } catch (e) {
      debugPrint('Chat error: $e');
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            text: 'Connection timed out or failed. Please check your network and try again.',
            isUser: false,
          ));
        });
        _scrollToBottom();
      }
    } finally {
      if (mounted) {
        setState(() {
          _isTyping = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Finance Copilot', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'New Conversation',
            onPressed: _startNewChat,
          ),
        ],
      ),
      body: _isLoadingHistory
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: _messages.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            return Align(
                              alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(
                                  maxWidth: MediaQuery.of(context).size.width * 0.82,
                                ),
                                margin: const EdgeInsets.symmetric(vertical: 5),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: msg.isUser ? Colors.blueAccent : Colors.grey.shade200,
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(14),
                                    topRight: const Radius.circular(14),
                                    bottomLeft: Radius.circular(msg.isUser ? 14 : 2),
                                    bottomRight: Radius.circular(msg.isUser ? 2 : 14),
                                  ),
                                ),
                                child: Text(
                                  msg.text,
                                  style: TextStyle(
                                    color: msg.isUser ? Colors.white : Colors.black87,
                                    fontSize: 14.5,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
                if (_isTyping)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'AI is thinking...',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.all(10.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(10),
                        blurRadius: 6,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            decoration: InputDecoration(
                              hintText: 'Ask about expenses, budgets, habits...',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(24),
                                borderSide: BorderSide(color: Colors.grey.shade300),
                              ),
                              filled: true,
                              fillColor: Colors.grey.shade50,
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        CircleAvatar(
                          backgroundColor: Colors.blueAccent,
                          radius: 22,
                          child: IconButton(
                            icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                            onPressed: () => _sendMessage(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.chat_bubble_outline_rounded, size: 48, color: Colors.blueAccent),
            ),
            const SizedBox(height: 16),
            const Text(
              'How can I help you today?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Ask me about your transactions, spending spikes, budgets, or recurring bills.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: _suggestions.map((suggestion) {
                return ActionChip(
                  label: Text(suggestion, style: const TextStyle(fontSize: 12.5)),
                  avatar: const Icon(Icons.lightbulb_outline, size: 16, color: Colors.blueAccent),
                  backgroundColor: Colors.grey.shade100,
                  onPressed: () => _sendMessage(suggestion),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
