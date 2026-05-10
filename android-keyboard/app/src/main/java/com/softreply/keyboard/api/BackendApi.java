package com.softreply.keyboard.api;

import android.util.Log;

import com.google.gson.Gson;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class BackendApi {
    private static final String TAG = "BackendApi";
    private static final Gson gson = new Gson();
    private static final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    public interface Callback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    public static void generateReplies(String baseUrl, String userId, GenerateReplyRequest request, Callback<GenerateReplyResponse> cb) {
        String url = baseUrl + "/replies/generate";
        String json = gson.toJson(request);
        RequestBody body = RequestBody.create(json, JSON);
        Request req = new Request.Builder()
                .url(url)
                .header("x-user-id", userId)
                .post(body)
                .build();

        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                cb.onError(e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (!response.isSuccessful()) {
                    cb.onError("HTTP " + response.code());
                    return;
                }
                String respBody = response.body().string();
                try {
                    GenerateReplyResponse result = gson.fromJson(respBody, GenerateReplyResponse.class);
                    cb.onSuccess(result);
                } catch (Exception e) {
                    cb.onError("Parse error: " + e.getMessage());
                }
            }
        });
    }
}
