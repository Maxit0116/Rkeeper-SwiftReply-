package com.softreply.keyboard.service;

import android.inputmethodservice.InputMethodService;
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

    private boolean isUpperCase = false;
    private String userId;

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
        keyboardView.findViewById(R.id.btn_copy).setOnClickListener(v -> copyToClipboard());
        keyboardView.findViewById(R.id.btn_settings).setOnClickListener(v -> openSettings());
        keyboardView.findViewById(R.id.btn_analyze).setOnClickListener(v -> openMiniProgram());

        setupKeys();
        return keyboardView;
    }

    private void setupKeys() {
        // Letter keys
        String[][] rows = {
            {"q","w","e","r","t","y","u","i","o","p"},
            {"a","s","d","f","g","h","j","k","l"},
            {"z","x","c","v","b","n","m"}
        };

        for (String[] row : rows) {
            for (String key : row) {
                int id = getResources().getIdentifier("key_" + key, "id", getPackageName());
                Button btn = keyboardView.findViewById(id);
                if (btn != null) {
                    btn.setOnClickListener(v -> onKeyClick(key));
                }
            }
        }

        // Special keys
        Button shiftBtn = keyboardView.findViewById(R.id.key_shift);
        Button delBtn = keyboardView.findViewById(R.id.key_del);
        Button spaceBtn = keyboardView.findViewById(R.id.key_space);
        Button enterBtn = keyboardView.findViewById(R.id.key_enter);
        Button commaBtn = keyboardView.findViewById(R.id.key_comma);
        Button periodBtn = keyboardView.findViewById(R.id.key_period);
        Button symBtn = keyboardView.findViewById(R.id.key_sym);

        if (shiftBtn != null) shiftBtn.setOnClickListener(v -> toggleShift());
        if (delBtn != null) delBtn.setOnClickListener(v -> onDelete());
        if (spaceBtn != null) spaceBtn.setOnClickListener(v -> onKeyClick(" "));
        if (enterBtn != null) enterBtn.setOnClickListener(v -> onEnter());
        if (commaBtn != null) commaBtn.setOnClickListener(v -> onKeyClick(","));
        if (periodBtn != null) periodBtn.setOnClickListener(v -> onKeyClick("."));
        if (symBtn != null) symBtn.setOnClickListener(v -> onKeyClick("?"));
    }

    private void onKeyClick(String text) {
        String output = isUpperCase ? text.toUpperCase() : text;
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.commitText(output, 1);
        }
    }

    private void onDelete() {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.deleteSurroundingText(1, 0);
        }
    }

    private void onEnter() {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            ic.sendKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER));
            ic.sendKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_ENTER));
        }
    }

    private void toggleShift() {
        isUpperCase = !isUpperCase;
        updateKeyLabels();
    }

    private void updateKeyLabels() {
        String[][] rows = {
            {"q","w","e","r","t","y","u","i","o","p"},
            {"a","s","d","f","g","h","j","k","l"},
            {"z","x","c","v","b","n","m"}
        };
        for (String[] row : rows) {
            for (String key : row) {
                int id = getResources().getIdentifier("key_" + key, "id", getPackageName());
                Button btn = keyboardView.findViewById(id);
                if (btn != null) {
                    btn.setText(isUpperCase ? key.toUpperCase() : key.toUpperCase());
                }
            }
        }
    }

    /**
     * Read current text from input box and generate AI replies
     */
    private void generateReplies() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) {
            statusText.setText("无法获取输入框");
            return;
        }

        // Read text before and after cursor to get full context
        CharSequence before = ic.getTextBeforeCursor(500, 0);
        CharSequence after = ic.getTextAfterCursor(500, 0);
        String currentContext = "";
        if (before != null) currentContext += before.toString();
        if (after != null) currentContext += after.toString();

        if (currentContext.trim().isEmpty()) {
            statusText.setText("等待输入上下文...");
            return;
        }

        statusText.setText("AI生成中...");
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
                new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
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
                new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
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
            btn.setTextColor(0xFFEEEEEE);
            btn.setBackgroundResource(R.drawable.bg_candidate);
            btn.setPadding(24, 16, 24, 16);
            btn.setAllCaps(false);
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
        android.content.Intent intent = new android.content.Intent(this, com.softreply.keyboard.SettingsActivity.class);
        intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
    }

    private void openMiniProgram() {
        copyToClipboard();
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
}
