package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mahimediasolutions.supportcenter.nativeapp.R

// Colors and spacing transcribed from Expo/src/constants/final-theme.ts and login.tsx.
private val BrandGreen = Color(0xFF0A7B61)
private val BrandCyan = Color(0xFF14BFC7)
private val BrandInk = Color(0xFF102321)
private val BrandMuted = Color(0xFF516A66)
private val BrandBorder = Color(0xFFDCE9E4)
private val BrandDanger = Color(0xFFC84B4B)

@Composable
fun ExpoParityLoginScreen(busy: Boolean, error: String?, onLogin: (String, String) -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var helpMessage by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val passFocus = remember { FocusRequester() }
    val canSubmit = email.isNotBlank() && password.isNotBlank() && !busy

    fun submit() {
        if (canSubmit) {
            focusManager.clearFocus()
            keyboard?.hide()
            onLogin(email.trim(), password)
        }
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Color(0xFFE7F6F0), Color(0xFFF7FBF9), Color.White))
        )
    ) {
        Box(Modifier.align(Alignment.TopEnd).offset(x = 94.dp, y = (-80).dp)
            .size(250.dp).background(Color(0x2614BFC7), RoundedCornerShape(125.dp)))
        Box(Modifier.align(Alignment.BottomStart).offset(x = (-80).dp, y = 100.dp)
            .size(230.dp).background(Color(0x188BE21D), RoundedCornerShape(115.dp)))

        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState())
                .padding(horizontal = 18.dp).padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(40.dp))
            Image(
                painter = painterResource(R.drawable.brand_supportcenter),
                contentDescription = "SupportCenter brand",
                modifier = Modifier.size(165.dp)
            )
            Spacer(Modifier.height(14.dp))
            Card(
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth(),
                border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEFFFE)),
                elevation = CardDefaults.cardElevation(defaultElevation = 7.dp)
            ) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp).padding(bottom = 20.dp)) {
                    Box(Modifier.align(Alignment.CenterHorizontally).width(170.dp).height(3.dp)
                        .background(BrandCyan, RoundedCornerShape(bottomStart = 3.dp, bottomEnd = 3.dp)))
                    Spacer(Modifier.height(22.dp))
                    Text("Welcome back", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-0.7).sp, color = BrandInk,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                    Spacer(Modifier.height(5.dp))
                    Text("Sign in to access your manager workspace", fontSize = 12.sp,
                        color = BrandMuted, lineHeight = 18.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(23.dp))

                    OutlinedTextField(
                        value = email, onValueChange = { email = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Work email", fontWeight = FontWeight.SemiBold) },
                        leadingIcon = { Icon(Icons.Outlined.MailOutline, null) },
                        shape = RoundedCornerShape(18.dp),
                        enabled = !busy,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { passFocus.requestFocus() }),
                        colors = fieldColors()
                    )
                    Spacer(Modifier.height(14.dp))
                    OutlinedTextField(
                        value = password, onValueChange = { password = it },
                        modifier = Modifier.fillMaxWidth().focusRequester(passFocus),
                        label = { Text("Password", fontWeight = FontWeight.SemiBold) },
                        leadingIcon = { Icon(Icons.Outlined.Lock, null) },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }, enabled = !busy) {
                                Icon(if (showPassword) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                                    contentDescription = if (showPassword) "Hide password" else "Show password",
                                    tint = BrandMuted)
                            }
                        },
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        shape = RoundedCornerShape(18.dp),
                        enabled = !busy,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { submit() }),
                        colors = fieldColors()
                    )
                    Spacer(Modifier.height(14.dp))
                    if (!error.isNullOrBlank()) {
                        Text(
                            text = error,
                            modifier = Modifier.fillMaxWidth().background(Color(0xFFFFF3F3), RoundedCornerShape(12.dp))
                                .padding(12.dp), color = BrandDanger, fontSize = 12.sp, lineHeight = 17.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(12.dp))
                    }
                    Text("Your workspace is selected automatically from your work account.",
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
                        fontSize = 10.sp, lineHeight = 15.sp, color = BrandMuted)
                    Spacer(Modifier.height(17.dp))
                    Box(
                        Modifier.fillMaxWidth().height(56.dp).clip(RoundedCornerShape(18.dp))
                            .background(Brush.horizontalGradient(listOf(Color(0xFF087A62), Color(0xFF0A9B72), Color(0xFF20C985))))
                            .alpha(if (canSubmit || busy) 1f else 0.5f)
                            .clickable(enabled = canSubmit) { submit() },
                        contentAlignment = Alignment.Center
                    ) {
                        if (busy) CircularProgressIndicator(color = Color.White,
                            strokeWidth = 2.dp, modifier = Modifier.size(23.dp))
                        else Text("Sign In", fontWeight = FontWeight.ExtraBold, color = Color.White,
                            fontSize = 15.sp)
                    }
                    Spacer(Modifier.height(13.dp))
                    TextButton(onClick = { helpMessage = !helpMessage },
                        modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text("Forgot password?", fontWeight = FontWeight.Bold,
                            color = BrandGreen, fontSize = 12.sp)
                    }
                    if (helpMessage) {
                        Text("Password reset is managed by your SupportCenter administrator.",
                            color = BrandMuted, fontSize = 11.sp, textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = BrandCyan,
    unfocusedBorderColor = BrandBorder,
    focusedLabelColor = BrandGreen,
    focusedLeadingIconColor = BrandGreen,
    unfocusedLabelColor = BrandMuted,
    unfocusedLeadingIconColor = BrandMuted,
    cursorColor = BrandGreen,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White
)
