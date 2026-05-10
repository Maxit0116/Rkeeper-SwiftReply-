package com.softreply.keyboard;

import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class SettingsActivity extends AppCompatActivity {

    private Spinner goalSpinner;
    private Spinner energySpinner;
    private Button saveBtn;

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
    }
}
