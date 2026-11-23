package com.mahimediasolutions.supportcenter.nativeapp.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mahimediasolutions.supportcenter.nativeapp.data.SnapshotData
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportRepository
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportSession
import com.mahimediasolutions.supportcenter.nativeapp.data.TicketConversation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class MainUiState(
    val starting: Boolean = true,
    val session: SupportSession? = null,
    val snapshot: SnapshotData? = null,
    val busy: Boolean = false,
    val refreshing: Boolean = false,
    val cached: Boolean = false,
    val error: String? = null,
    val tab: String = "Overview",
    val periodDays: Int = 90,
    val selectedTicketId: Long? = null,
    val selectedDevice: String? = null,
    val conversation: TicketConversation? = null,
    val conversationLoading: Boolean = false,
    val conversationError: String? = null
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = SupportRepository(application)
    private val _state = MutableStateFlow(MainUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val session = withContext(Dispatchers.IO) { repo.restoreSession() }
            _state.value = _state.value.copy(starting = false, session = session)
            if (session != null) refreshSnapshot()
        }
    }

    fun signIn(email: String, password: String) {
        if (_state.value.busy) return
        if (email.trim().isEmpty() || password.isEmpty()) {
            _state.value = _state.value.copy(error = "Enter your work email and password")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(busy = true, error = null)
            try {
                val session = withContext(Dispatchers.IO) { repo.login(email, password) }
                _state.value = MainUiState(starting = false, session = session, refreshing = false)
                refreshSnapshot()
            } catch (e: Exception) {
                _state.value = _state.value.copy(busy = false, error = e.message ?: "Unable to sign in")
            }
        }
    }

    fun refreshSnapshot() {
        val session = _state.value.session ?: return
        if (_state.value.refreshing) return
        viewModelScope.launch {
            _state.value = _state.value.copy(refreshing = true, error = null)
            val loaded = withContext(Dispatchers.IO) { repo.loadSnapshot(session) }
            // Do not accept late results belonging to an old login/workspace.
            if (_state.value.session?.user?.id != session.user.id ||
                _state.value.session?.workspace?.id != session.workspace.id) return@launch
            _state.value = _state.value.copy(
                refreshing = false, session = loaded.session, snapshot = loaded.data,
                cached = loaded.fromCache, error = loaded.error,
                conversation = null, selectedTicketId = null, selectedDevice = null
            )
        }
    }

    fun selectTab(tab: String) {
        _state.value = _state.value.copy(tab = tab, selectedTicketId = null,
            selectedDevice = null, conversation = null, conversationError = null)
    }

    fun setPeriod(days: Int) {
        if (days !in listOf(1, 7, 30, 90)) return
        _state.value = _state.value.copy(periodDays = days)
    }

    fun openTicket(ticketId: Long) {
        val exists = _state.value.snapshot?.tickets?.any { it.id == ticketId } == true
        if (!exists) { _state.value = _state.value.copy(error = "Ticket not found in current workspace snapshot") ; return }
        _state.value = _state.value.copy(selectedTicketId = ticketId, selectedDevice = null,
            conversation = null, conversationError = null, conversationLoading = true)
        refreshConversation()
    }

    fun openDevice(device: String) {
        if (device.isBlank()) return
        _state.value = _state.value.copy(selectedDevice = device, selectedTicketId = null,
            conversation = null, conversationError = null)
    }

    fun closeDetail() {
        _state.value = _state.value.copy(selectedTicketId = null, selectedDevice = null,
            conversation = null, conversationLoading = false, conversationError = null)
    }

    fun refreshConversation() {
        val session = _state.value.session ?: return
        val ticketId = _state.value.selectedTicketId ?: return
        if (_state.value.conversationLoading && _state.value.conversation != null) return
        _state.value = _state.value.copy(conversationLoading = true, conversationError = null)
        viewModelScope.launch {
            try {
                val loaded = withContext(Dispatchers.IO) { repo.loadConversation(session, ticketId) }
                if (!sameSession(session) || _state.value.selectedTicketId != ticketId) return@launch
                _state.value = _state.value.copy(
                    session = loaded.session, conversation = loaded.conversation,
                    conversationLoading = false, conversationError = null
                )
            } catch (e: Exception) {
                if (!sameSession(session) || _state.value.selectedTicketId != ticketId) return@launch
                _state.value = _state.value.copy(conversationLoading = false,
                    conversationError = e.message ?: "Conversation could not be loaded")
            }
        }
    }

    private fun sameSession(session: SupportSession): Boolean =
        _state.value.session?.user?.id == session.user.id &&
        _state.value.session?.workspace?.id == session.workspace.id

    fun clearOfflineCache() {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repo.clearOfflineCache() }
                if (!sameSession(session)) return@launch
                _state.value = _state.value.copy(
                    snapshot = null, cached = false,
                    error = "Local encrypted snapshots cleared. Refresh to load server data.",
                    selectedTicketId = null, selectedDevice = null, conversation = null
                )
            } catch (e: Exception) {
                if (sameSession(session)) _state.value = _state.value.copy(
                    error = e.message ?: "Unable to clear offline snapshots"
                )
            }
        }
    }

    fun signOut() {
        val session = _state.value.session ?: return
        _state.value = MainUiState(starting = false)
        viewModelScope.launch { withContext(Dispatchers.IO) { repo.logout(session) } }
    }
}
