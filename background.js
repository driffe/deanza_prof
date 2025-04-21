chrome.runtime.onInstalled.addListener(() => {
  // Set default state when the extension is installed
  chrome.storage.sync.set({ extensionActive: true });
  
  // Load professor data from the included CSV file
  loadProfessorData();
});

// Function to load and parse CSV data from the data.csv file
async function loadProfessorData() {
  try {
    // Get the URL for the data.csv file within the extension
    const csvURL = chrome.runtime.getURL('deanza_professors_data.csv');
    
    // Fetch the CSV file
    const response = await fetch(csvURL);
    if (!response.ok) {
      throw new Error(`CSV 파일 로드 실패: ${response.status}`);
    }
    
    // Get CSV content as text
    const csvContent = await response.text();
    
    // Parse CSV data
    const professors = parseCSV(csvContent);
    
    // Store the professor data
    const professorsIndex = createSearchIndex(professors);
    
    await chrome.storage.local.set({ 
      professorData: professors,
      professorsIndex: professorsIndex,
      dataLastLoaded: new Date().toISOString()
    });
    
    console.log(`${professors.length}명의 교수 데이터를 성공적으로 로드했습니다.`);
  } catch (error) {
    console.error('교수 데이터 로드 중 오류:', error);
  }
}

// Parse CSV function
function parseCSV(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  const professors = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(value => value.trim());
    if (values.length !== headers.length) continue;
    
    const professor = {};
    headers.forEach((header, index) => {
      // XSS 방지를 위한 데이터 이스케이프
      professor[header] = escapeHtml(values[index]);
    });
    
    professors.push(professor);
  }
  
  return professors;
}

// 검색 인덱스 생성 함수
function createSearchIndex(professors) {
  return professors.reduce((index, prof, i) => {
    if (prof.Name) {
      const searchableText = prof.Name.toLowerCase();
      const nameParts = searchableText.split(' ');
      
      // 전체 이름으로 인덱싱
      if (!index[searchableText]) {
        index[searchableText] = [];
      }
      index[searchableText].push(i);
      
      // 성으로 인덱싱
      const lastName = nameParts[nameParts.length - 1];
      if (!index[lastName]) {
        index[lastName] = [];
      }
      index[lastName].push(i);
    }
    return index;
  }, {});
}

// XSS 방지를 위한 HTML 이스케이프 함수
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reloadData") {
    loadProfessorData()
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('데이터 리로드 중 오류:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.action === "openFloatingWindow") {
    // 활성 탭에 floating-window를 열라는 메시지 전달
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "openFloatingWindow"}, function(response) {
          if (sendResponse) sendResponse(response);
        });
      }
    });
    return true;
  }
});