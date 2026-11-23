package com.mahimediasolutions.supportcenter.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.mahimediasolutions.supportcenter.nativeapp.ui.MainViewModel
import com.mahimediasolutions.supportcenter.nativeapp.ui.SupportApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val vm: MainViewModel = viewModel()
            val state by vm.state.collectAsState()
            SupportApp(
                state = state,
                onLogin = vm::signIn,
                onRefresh = vm::refreshSnapshot,
                onLogout = vm::signOut,
                onTab = vm::selectTab,
                onPeriod = vm::setPeriod,
                onOpenTicket = vm::openTicket,
                onOpenDevice = vm::openDevice,
                onDetailBack = vm::closeDetail,
                onRefreshConversation = vm::refreshConversation,
                onClearCache = vm::clearOfflineCache
            )
        }
    }
}
