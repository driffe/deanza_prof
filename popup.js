document.addEventListener('DOMContentLoaded', function() {
  // Load saved state for the toggle
  chrome.storage.sync.get(['extensionActive'], function(result) {
    const toggle = document.getElementById('extensionToggle');
    if (result.extensionActive !== undefined) {
      toggle.checked = result.extensionActive;
    }
  });

  // Save toggle state changes
  document.getElementById('extensionToggle').addEventListener('change', function(e) {
    const isActive = e.target.checked;
    chrome.storage.sync.set({ extensionActive: isActive });
    
    // Inform content scripts about the state change
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "toggleExtension", isActive: isActive});
      }
    });
  });

  // Load saved notes
  chrome.storage.sync.get(['notes'], function(result) {
    const notesArea = document.getElementById('notesArea');
    if (result.notes) {
      notesArea.value = result.notes;
    }
  });

  // Save notes on input
  document.getElementById('notesArea').addEventListener('input', function(e) {
    chrome.storage.sync.set({ notes: e.target.value });
  });
  
  // Display professor data status
  updateDataStatus();
  
  // Reload data button handler
  document.getElementById('reloadDataBtn').addEventListener('click', function() {
    document.getElementById('dataStatus').textContent = 'Reloading data...';
    
    // Call background script to reload CSV data
    chrome.runtime.sendMessage({action: "reloadData"}, function(response) {
      if (response && response.success) {
        updateDataStatus();
      } else {
        document.getElementById('dataStatus').textContent = 'Error reloading data';
      }
    });
  });
  
  // Function to update data status display
  function updateDataStatus() {
    chrome.storage.local.get(['professorData', 'dataLastLoaded'], function(result) {
      const dataStatus = document.getElementById('dataStatus');
      
      if (result.professorData) {
        const count = result.professorData.length;
        let lastLoaded = '';
        
        if (result.dataLastLoaded) {
          const date = new Date(result.dataLastLoaded);
          lastLoaded = `Last updated: ${date.toLocaleTimeString()}`;
        }
        
        dataStatus.textContent = `Loaded ${count} professors from data.csv. ${lastLoaded}`;
      } else {
        dataStatus.textContent = 'No professor data loaded';
      }
    });
  }
});