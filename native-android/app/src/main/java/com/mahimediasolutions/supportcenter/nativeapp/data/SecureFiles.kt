package com.mahimediasolutions.supportcenter.nativeapp.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Android Keystore AES-256-GCM. No token or snapshot plaintext is saved to disk. */
internal class SecureFiles(private val context: Context) {
    private val alias = "supportcenter.native.batch1.aes.v1"
    private val privateDirectory = File(context.filesDir, "supportcenter-native").apply { mkdirs() }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(alias, null) as? SecretKey
        if (existing != null) return existing
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(
                alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
             .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
             .setKeySize(256)
             .setRandomizedEncryptionRequired(true)
             .build())
        }.generateKey()
    }

    private fun fileFor(name: String): File {
        require(name.matches(Regex("[a-zA-Z0-9_.-]+")))
        return File(privateDirectory, name)
    }

    fun write(name: String, raw: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val bytes = cipher.doFinal(raw.toByteArray(Charsets.UTF_8))
        val data = cipher.iv + bytes
        val tmp = fileFor("$name.tmp")
        tmp.writeBytes(data)
        // Rename atomically within the same directory to avoid half-written snapshots.
        val destination = fileFor(name)
        if (!tmp.renameTo(destination)) {
            destination.writeBytes(data)
            tmp.delete()
        }
    }

    fun read(name: String): String? {
        val f = fileFor(name)
        if (!f.exists()) return null
        return try {
            val data = f.readBytes()
            if (data.size < 29) return null
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, data.copyOfRange(0, 12)))
            String(cipher.doFinal(data.copyOfRange(12, data.size)), Charsets.UTF_8)
        } catch (_: Exception) { null }
    }

    fun delete(name: String) { fileFor(name).delete() }
    fun deleteCaches() { privateDirectory.listFiles()?.filter { it.name.startsWith("snapshot-") }?.forEach { it.delete() } }
}
