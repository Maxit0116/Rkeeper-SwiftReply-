package com.softreply.keyboard;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class SettingsActivity extends AppCompatActivity {

    private Spinner goalSpinner;
    private Spinner energySpinner;
    private Button saveBtn;
    private Button a11yBtn;
    private TextView a11yStatus;

    private static final String[] GOALS = {
        "快速结束聊天",
        "礼貌维持关系",
        "不想继续深聊",
        "不想透露隐私",
        "看起来很忙",
        "已读修复",
        "想委婉拒绝",
        "想降低情绪消耗",
    };

    private static final String[] ENERGY = {
        "社交电量耗尽",
        "今天不想说话",
        "已经回复累了",
        "不想继续解释",
        "不想动脑子",
        "正常",
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        goalSpinner = findViewById(R.id.spinner_goal);
        energySpinner = findViewById(R.id.spinner_energy);
        saveBtn = findViewById(R.id.btn_save);
        a11yBtn = findViewById(R.id.btn_a11y);
        a11yStatus = findViewById(R.id.tv_a11y_status);

        ArrayAdapter<String> goalAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, GOALS);
        goalAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        goalSpinner.setAdapter(goalAdapter);

        ArrayAdapter<String> energyAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, ENERGY);
        energyAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        energySpinner.setAdapter(energyAdapter);

        // Load saved values
        String savedGoal = getSharedPreferences("softreply", MODE_PRIVATE).getString("current_goal", GOALS[1]);
        String savedEnergy = getSharedPreferences("softreply", MODE_PRIVATE).getString("energy_level", ENERGY[5]);
        goalSpinner.setSelection(java.util.Arrays.asList(GOALS).indexOf(savedGoal));
        energySpinner.setSelection(java.util.Arrays.asList(ENERGY).indexOf(savedEnergy));

        saveBtn.setOnClickListener(v -> {
            String goal = goalSpinner.getSelectedItem().toString();
            String energy = energySpinner.getSelectedItem().toString();
            getSharedPreferences("softreply", MODE_PRIVATE)
                    .edit()
                    .putString("current_goal", goal)
                    .putString("energy_level", energy)
                    .apply();
            Toast.makeText(this, "设置已保存", Toast.LENGTH_SHORT).show();
            finish();
        });

        a11yBtn.setOnClickListener(v -> {
            // Open system accessibility settings to enable our service
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivity(intent);
            Toast.makeText(this, "请在列表中找到\"没电键盘辅助服务\"并开启", Toast.LENGTH_LONG).show();
        });

        updateA11yStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateA11yStatus();
    }

    private void updateA11yStatus() {
        // Check if our accessibility service is enabled
        String enabledServices = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        String ourService = getPackageName() + "/.service.WeChatAccessibilityService";
        boolean isEnabled = enabledServices != null && enabledServices.contains(ourService);

        if (isEnabled) {
            a11yStatus.setText("状态：已开启 ✅\n会自动读取微信聊天上下文");
            a11yStatus.setTextColor(0xFF4CAF50);
            a11yBtn.setText("关闭辅助服务");
        } else {
            a11yStatus.setText("状态：未开启 ⚪\n开启后可自动读取微信聊天内容");
            a11yStatus.setTextColor(0xFF888888);
            a11yBtn.setText("开启辅助服务");
        }
    }
}
