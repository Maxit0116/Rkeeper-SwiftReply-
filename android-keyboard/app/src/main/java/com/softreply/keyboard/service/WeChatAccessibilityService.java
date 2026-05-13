package com.softreply.keyboard.service;

import android.accessibilityservice.AccessibilityService;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.ArrayList;
import java.util.List;

public class WeChatAccessibilityService extends AccessibilityService {
    private static final String TAG = "WeChatA11y";
    private static final String WECHAT_PACKAGE = "com.tencent.mm";

    // Callback interface for IME to receive chat context
    public interface ChatContextListener {
        void onChatContextUpdated(String context);
    }

    private static ChatContextListener sListener;

    public static void setListener(ChatContextListener listener) {
        sListener = listener;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";
        if (!packageName.equals(WECHAT_PACKAGE)) return;

        // Try to extract chat messages from the window content
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        List<String> messages = extractChatMessages(root);
        root.recycle();

        if (!messages.isEmpty()) {
            StringBuilder context = new StringBuilder();
            for (String msg : messages) {
                context.append(msg).append("\n");
            }
            String result = context.toString().trim();
            Log.d(TAG, "Extracted chat context (" + messages.size() + " messages)");

            if (sListener != null) {
                sListener.onChatContextUpdated(result);
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility service connected");
    }

    /**
     * Try to extract text from common WeChat chat bubble node patterns
     */
    private List<String> extractChatMessages(AccessibilityNodeInfo root) {
        List<String> messages = new ArrayList<>();
        findTextNodes(root, messages);
        return messages;
    }

    private void findTextNodes(AccessibilityNodeInfo node, List<String> result) {
        if (node == null) return;

        // WeChat chat bubbles often have specific class names or content descriptions
        CharSequence text = node.getText();
        if (text != null && text.length() > 0) {
            String str = text.toString().trim();
            // Filter out UI labels, keep actual messages
            if (str.length() > 1 && !isSystemLabel(str)) {
                result.add(str);
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            findTextNodes(node.getChild(i), result);
        }
    }

    private boolean isSystemLabel(String text) {
        // Filter out common UI labels that are not chat messages
        String[] labels = {
            "微信", "通讯录", "发现", "我",
            "发送", "按住 说话", "Tap to convert to text",
            "返回", "更多", "设置", "聊天信息",
            "对方正在输入...", "朋友圈", "公众号"
        };
        for (String label : labels) {
            if (text.contains(label)) return true;
        }
        return false;
    }
}
