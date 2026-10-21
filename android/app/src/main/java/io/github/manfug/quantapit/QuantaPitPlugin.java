package io.github.manfug.quantapit;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "QuantaPit")
public final class QuantaPitPlugin extends Plugin {
    private static final ExecutorService FILE_IO = Executors.newSingleThreadExecutor();
    private boolean exporting;
    private File pendingExport;

    @PluginMethod
    public void exportSession(PluginCall call) {
        String source = call.getString("source");
        String filename = call.getString("filename");
        if (source == null || filename == null || filename.isEmpty()) {
            call.reject("A JSON source and filename are required.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (exporting) {
                call.reject("Another session export is already open.");
                return;
            }
            exporting = true;
            Context context = getContext().getApplicationContext();
            Activity activity = getActivity();
            // Stage privately so neither JSON nor file bytes enter Activity saved state.
            FILE_IO.execute(() -> {
                File staged = null;
                try {
                    staged = File.createTempFile("quantapit-export-", ".json", context.getCacheDir());
                    try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(
                            new FileOutputStream(staged), StandardCharsets.UTF_8))) {
                        writer.write(source);
                    }
                    File ready = staged;
                    activity.runOnUiThread(() -> {
                        if (activity.isDestroyed() || activity.isFinishing()) {
                            discard(ready);
                            exporting = false;
                            call.reject("Export interrupted before the document picker opened. Please try again.");
                            return;
                        }
                        pendingExport = ready;
                        call.getData().remove("source");
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                                .addCategory(Intent.CATEGORY_OPENABLE)
                                .setType("application/json").putExtra(Intent.EXTRA_TITLE, filename);
                        try {
                            startActivityForResult(call, intent, "documentCreated");
                        } catch (RuntimeException error) {
                            pendingExport = null;
                            exporting = false;
                            discard(ready);
                            call.reject("The document picker could not be opened.", error);
                        }
                    });
                } catch (IOException | SecurityException error) {
                    discard(staged);
                    activity.runOnUiThread(() -> {
                        exporting = false;
                        call.reject("Could not prepare the session export.", error);
                    });
                }
            });
        });
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        File staged = pendingExport;
        pendingExport = null;
        if (result.getResultCode() != Activity.RESULT_OK) {
            exporting = false;
            discard(staged);
            resolveSaved(call, false);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (staged == null || uri == null) {
            exporting = false;
            discard(staged);
            if (call != null) call.reject("The document picker did not return a writable destination or the export expired.");
            return;
        }
        Context context = getContext().getApplicationContext();
        Activity activity = getActivity();
        FILE_IO.execute(() -> {
            try (FileInputStream input = new FileInputStream(staged);
                    OutputStream output = context.getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IOException("No output stream was returned.");
                byte[] buffer = new byte[16 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.flush();
            } catch (IOException | RuntimeException error) {
                activity.runOnUiThread(() -> {
                    exporting = false;
                    if (call != null) call.reject("The session could not be written. Please choose another destination.", error);
                });
                return;
            } finally {
                staged.delete();
            }
            activity.runOnUiThread(() -> {
                exporting = false;
                resolveSaved(call, true);
            });
        });
    }

    @Override
    protected Bundle saveInstanceState() {
        if (pendingExport == null) return null;
        Bundle state = new Bundle();
        state.putString("pending_export", pendingExport.getName());
        return state;
    }

    @Override
    protected void restoreState(Bundle state) {
        String name = state.getString("pending_export");
        if (name != null && name.matches("quantapit-export-[A-Za-z0-9-]+\\.json")) {
            pendingExport = new File(getContext().getCacheDir(), name);
            exporting = true;
        }
    }

    private static void resolveSaved(PluginCall call, boolean saved) {
        if (call == null) return;
        JSObject response = new JSObject();
        response.put("saved", saved);
        call.resolve(response);
    }

    private static void discard(File file) {
        if (file != null) FILE_IO.execute(file::delete);
    }
}
