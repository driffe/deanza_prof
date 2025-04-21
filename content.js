let popup = null;
let popupTimer = null;
let isExtensionActive = true;
let popupVisible = false;

// 확장 프로그램 상태 초기화
function initializeExtension() {
  chrome.storage.sync.get(['extensionActive'], function(result) {
    if (result.extensionActive !== undefined) {
      isExtensionActive = result.extensionActive;
    }
  });
}

// 메시지 리스너 설정
function setupMessageListener() {
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    try {
      if (message.action === "toggleExtension") {
        isExtensionActive = message.isActive;
        sendResponse({ success: true });
      } else if (message.action === "openFloatingWindow") {
        createFloatingWindow();
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  });
}

// 초기화 함수 실행
initializeExtension();
setupMessageListener();

// Get selected text function
function getSelectedText() {
  return window.getSelection().toString().trim();
}

// 교수 정보 포맷팅
function formatProfessorInfo(professor) {
  console.log('포맷팅할 교수 정보:', professor);
  
  const ratingNum = parseFloat(professor.Rating) || 0;
  const ratingColor = ratingNum >= 3.5 ? '#4CAF50' : ratingNum >= 2.5 ? '#FFC107' : '#F44336';
  
  const difficultyNum = parseFloat(professor["Level of Difficulty"]) || 0;
  const difficultyColor = difficultyNum <= 2.5 ? '#4CAF50' : difficultyNum <= 3.5 ? '#FFC107' : '#F44336';
  
  return `
    <div class="professor-header">
      <h3 class="professor-name">${professor.Name}</h3>
      <button class="close-button">×</button>
    </div>
    <div class="department-info">${professor.Department}</div>
    <div class="professor-stats">
      <div class="stat-item">
        <div class="stat-label">Rating</div>
        <div class="stat-value" style="color: ${ratingColor};">${professor.Rating}/5</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Would Take Again</div>
        <div class="stat-value">${professor["Would Take Again"]}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Difficulty</div>
        <div class="stat-value" style="color: ${difficultyColor};">${professor["Level of Difficulty"]}/5</div>
      </div>
    </div>
  `;
}

// 팝업 위치 조정 함수
function positionPopup(popup, x, y) {
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 스크롤 위치 고려
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // 초기 위치 설정
  let left = x + scrollX;
  let top = y + scrollY;
  
  // 우측 경계 체크
  if (left + rect.width > viewportWidth + scrollX) {
    left = viewportWidth + scrollX - rect.width - 20;
  }
  
  // 하단 경계 체크
  if (top + rect.height > viewportHeight + scrollY) {
    top = y + scrollY - rect.height - 10;
  }
  
  // 좌측 경계 체크
  if (left < scrollX) {
    left = scrollX + 20;
  }
  
  // 상단 경계 체크
  if (top < scrollY) {
    top = scrollY + 20;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// 팝업 생성 함수
function createPopup() {
  const div = document.createElement('div');
  div.className = 'professor-info-popup';
  div.style.display = 'none';
  document.body.appendChild(div);
  return div;
}

// 팝업 표시 함수
function showPopup(professor, x, y) {
  if (!popup) {
    popup = createPopup();
  }
  
  popup.innerHTML = formatProfessorInfo(professor);
  popup.style.display = 'block';
  
  // 팝업이 DOM에 추가되고 크기가 계산된 후 위치 조정
  requestAnimationFrame(() => {
    positionPopup(popup, x, y);
  });
  
  // 닫기 버튼 이벤트 리스너 추가
  const closeButton = popup.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      popup.style.display = 'none';
    });
  }
}

// 교수 검색 함수
function findMatchingProfessor(selectedText, professorData) {
  console.log('검색 시작:', selectedText);
  const searchText = selectedText.toLowerCase().trim();
  
  for (let i = 0; i < professorData.length; i++) {
    const prof = professorData[i];
    if (prof.Name.toLowerCase().includes(searchText)) {
      console.log('교수 찾음:', prof);
      return prof;
    }
  }
  
  console.log('교수를 찾을 수 없음');
  return null;
}

// 마우스 업 이벤트 핸들러
document.addEventListener('mouseup', function(e) {
  if (!isExtensionActive) return;
  
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText || selectedText.length < 2) return;
  
  console.log('선택된 텍스트:', selectedText);
  
  chrome.storage.local.get(['professorData'], function(result) {
    if (!result.professorData) {
      console.log('교수 데이터가 없습니다');
      return;
    }
    
    const matchingProfessor = findMatchingProfessor(selectedText, result.professorData);
    if (!matchingProfessor) return;
    
    showPopup(matchingProfessor, e.clientX, e.clientY);
  });
});

// 팝업 이벤트 리스너 설정
function setupPopupEventListeners(popup) {
  const closeButton = popup.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', function(evt) {
      evt.stopPropagation();
      hidePopup();
    });
  }
  
  // 자동 숨김 타이머 설정
  popupTimer = setTimeout(function() {
    if (popup && popupVisible) {
      hidePopup();
    }
  }, 7000);
}

// 팝업 표시 함수
function showProfessorPopup(professor, event) {
  try {
    // 이전 팝업이 있다면 제거
    if (popup) {
      document.body.removeChild(popup);
      popup = null;
    }
    
    popup = createPopup();
    popup.innerHTML = formatProfessorInfo(professor);
    
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    positionPopup(popup, rect.left, rect.bottom + 10);
    setupPopupEventListeners(popup);
    
    // 이벤트 전파 중지
    event.stopPropagation();
  } catch (error) {
    console.error('팝업 표시 중 오류:', error);
  }
}

// 팝업 숨기기 함수
function hidePopup() {
  if (popup) {
    popup.style.display = 'none';
    popupVisible = false;
  }
}

// 타이머 초기화 함수
function clearExistingTimer() {
  if (popupTimer) {
    clearTimeout(popupTimer);
    popupTimer = null;
  }
}