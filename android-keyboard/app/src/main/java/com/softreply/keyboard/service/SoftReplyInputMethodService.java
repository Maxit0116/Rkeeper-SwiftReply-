package com.softreply.keyboard.service;

import android.inputmethodservice.InputMethodService;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.softreply.keyboard.R;
import com.softreply.keyboard.api.BackendApi;
import com.softreply.keyboard.api.GenerateReplyRequest;
import com.softreply.keyboard.api.GenerateReplyResponse;

import java.util.UUID;

public class SoftReplyInputMethodService extends InputMethodService {
    private static final String TAG = "SoftReplyIME";
    private static final String API_BASE = "http://10.0.2.2:3000/api"; // emulator localhost

    private LinearLayout candidateContainer;
    private TextView statusText;
    private Button regenerateBtn;
    private View keyboardView;

    private String currentContext = "";
    private String userId;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        userId = getSharedPreferences("softreply", MODE_PRIVATE)
                .getString("user_id", null);
        if (userId == null) {
            userId = UUID.randomUUID().toString();
            getSharedPreferences("softreply", MODE_PRIVATE)
                    .edit().putString("user_id", userId).apply();
        }
    }

    @Override
    public View onCreateInputView() {
        keyboardView = LayoutInflater.from(this).inflate(R.layout.keyboard_view, null);
        candidateContainer = keyboardView.findViewById(R.id.candidate_container);
        statusText = keyboardView.findViewById(R.id.status_text);
        regenerateBtn = keyboardView.findViewById(R.id.btn_regenerate);

        regenerateBtn.setOnClickListener(v -> generateReplies());

        // Quick action buttons
        keyboardView.findViewById(R.id.btn_copy).setOnClickListener(v -> copyToClipboard());
        keyboardView.findViewById(R.id.btn_settings).setOnClickListener(v -> openSettings());
        keyboardView.findViewById(R.id.btn_analyze).setOnClickListener(v -> openMiniProgram());

        return keyboardView;
    }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        // Auto-trigger mode: try to get current input text as context
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            CharSequence text = ic.getTextBeforeCursor(200, 0);
            if (text != null) {
                currentContext = text.toString();
                if (!currentContext.isEmpty()) {
                    generateReplies();
                }
            }
        }
    }

    private void generateReplies() {
        if (currentContext.isEmpty()) {
            statusText.setText("等待输入上下文...");
            return;
        }
        statusText.setText(R.string.ai_generating);
        candidateContainer.removeAllViews();

        GenerateReplyRequest req = new GenerateReplyRequest();
        req.context = currentContext;
        req.mode = "keyboard";
        req.currentGoal = getSharedPreferences("softreply", MODE_PRIVATE)
                .getString("current_goal", "礼貌维持关系");
        req.energyLevel = getSharedPreferences("softreply", MODE_PRIVATE)
                .getString("energy_level", "正常");

        BackendApi.generateReplies(API_BASE, userId, req, new BackendApi.Callback<GenerateReplyResponse>() {
            @Override
            public void onSuccess(GenerateReplyResponse result) {
                mainHandler.post(() -> {
                    statusText.setText("策略: " + result.strategy);
                    if (result.matchedProfile != null) {
                        statusText.setText(result.matchedProfile.emoji + " " + result.matchedProfile.nickname
                                + " · " + result.strategy);
                    }
                    renderSuggestions(result.suggestions);
                });
            }

            @Override
            public void onError(String error) {
                mainHandler.post(() -> {
                    statusText.setText("生成失败，点击重试");
                    Log.e(TAG, "API error: " + error);
                });
            }
        });
    }

    private void renderSuggestions(String[] suggestions) {
        candidateContainer.removeAllViews();
        if (suggestions == null || suggestions.length == 0) return;

        for (int i = 0; i < suggestions.length; i++) {
            final String text = suggestions[i];
            Button btn = new Button(this);
            btn.setText(text);
            btn.setTextSize(14);
            btn.setBackgroundResource(R.drawable.bg_candidate);
            btn.setPadding(24, 16, 24, 16);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(12, 8, 12, 8);
            btn.setLayoutParams(lp);

            btn.setOnClickListener(v -> commitText(text));
            btn.setOnLongClickListener(v -> {
                copyToClipboard(text);
                return true;
            });
            candidateContainer.addView(btn);
        }
    }

    private void commitText(String text) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.commitText(text, 1);
        }
    }

    private void copyToClipboard() {
        copyToClipboard(null);
    }

    private void copyToClipboard(String text) {
        if (text == null && candidateContainer.getChildCount() > 0) {
            View first = candidateContainer.getChildAt(0);
            if (first instanceof Button) {
                text = ((Button) first).getText().toString();
            }
        }
        if (!TextUtils.isEmpty(text)) {
            android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            cm.setPrimaryClip(android.content.ClipData.newPlainText("reply", text));
            Toast.makeText(this, R.string.copy_success, Toast.LENGTH_SHORT).show();
        }
    }

    private void openSettings() {
        // Open settings activity
        android.content.Intent intent = new android.content.Intent(this, com.softreply.keyboard.SettingsActivity.class);
        intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
    }

    private void openMiniProgram() {
        // Copy best reply or current context to clipboard
        copyToClipboard();
        
        // Try to launch WeChat
        try {
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_MAIN);
            android.content.ComponentName cmp = new android.content.ComponentName(
                    "com.tencent.mm", "com.tencent.mm.ui.LauncherUI");
            intent.setComponent(cmp);
            intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            Toast.makeText(this, "已复制，请粘贴到稳一手小程序", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "已复制到剪贴板，请手动打开微信", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onWindowHidden() {
        super.onWindowHidden();
        currentContext = "";
    }
}
