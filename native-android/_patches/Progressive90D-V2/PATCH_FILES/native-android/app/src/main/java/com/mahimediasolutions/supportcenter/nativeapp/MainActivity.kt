package com.mahimediasolutions.supportcenter.nativeapp

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.mahimediasolutions.supportcenter.nativeapp.ui.MainViewModel
import com.mahimediasolutions.supportcenter.nativeapp.ui.SupportApp

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by lazy { ViewModelProvider(this)[MainViewModel::class.java] }
    private val pollHandler = Handler(Looper.getMainLooper())
    private val snapshotPoll = object : Runnable {
        override fun run() {
            vm.checkForUpdates()
            pollHandler.postDelayed(this, 10 * 60_000L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
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

    override fun onStart() {
        super.onStart()
        pollHandler.postDelayed(snapshotPoll, 10 * 60_000L)
    }

    override fun onResume() {
        super.onResume()
        vm.checkForUpdates()
    }

    override fun onStop() {
        pollHandler.removeCallbacks(snapshotPoll)
        super.onStop()
    }
}
