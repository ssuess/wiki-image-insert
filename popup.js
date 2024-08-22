let currentOffset = 0;
let currentQuery = '';

document.getElementById('searchQuery').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    document.getElementById('searchButton').click();
  }
});


document.getElementById('searchButton').addEventListener('click', () => {
  currentQuery = document.getElementById('searchQuery').value;
  currentOffset = 0; // Reset offset on new search
  showLoadingSpinner(); 
  searchImages(currentQuery, currentOffset);
});

document.getElementById('nextButton').addEventListener('click', () => {
  currentOffset += 10;
  searchImages(currentQuery, currentOffset);
});

document.getElementById('prevButton').addEventListener('click', () => {
  if (currentOffset > 0) {
    currentOffset -= 10;
    searchImages(currentQuery, currentOffset);
  }
});

async function searchImages(query, offset) {
  if (!query) {
    alert('Please enter a search term');
    return;
  }

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=10&sroffset=${offset}&srwhat=text&srnamespace=6&prop=imageinfo&iiprop=url`);
    const data = await response.json();

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (data.query && data.query.search.length) {
      const pages = data.query.search;

      for (let page of pages) {
        const imageResponse = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&pageids=${page.pageid}&iiprop=url`);
        const imageData = await imageResponse.json();

        if (imageData.query && imageData.query.pages) {
          const imageInfo = imageData.query.pages[page.pageid].imageinfo;
          if (imageInfo && imageInfo[0]) {
            const img = document.createElement('img');
            img.src = imageInfo[0].url;
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
              insertImageMarkup(`[[${imageData.query.pages[page.pageid].title}|thumb|Caption text]]`);
            });
            resultsContainer.appendChild(img);
          }
        }
      }

      // Enable/disable pagination buttons based on results and offset
      document.getElementById('nextButton').disabled = data.continue ? false : true;
      document.getElementById('prevButton').disabled = offset === 0;

    } else {
      resultsContainer.innerText = 'No images found';
      document.getElementById('nextButton').disabled = true;
      document.getElementById('prevButton').disabled = true;
    }
  } catch (error) {
    console.error('Error fetching images:', error);
  } finally {
    hideLoadingSpinner();
  }
  
}

function showLoadingSpinner() {
	document.getElementById('stext').style.visibility = 'hidden';
  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('searchButton').disabled = true;
}

function hideLoadingSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('stext').style.visibility = 'visible';
  document.getElementById('searchButton').disabled = false;
}

function insertImageMarkup(markup) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (markup) => {
        const editor = document.querySelector('#wpTextbox1'); // Wikipedia editor textarea ID
        if (editor) {
          const startPos = editor.selectionStart;
          const endPos = editor.selectionEnd;
          editor.value = editor.value.substring(0, startPos) + markup + editor.value.substring(endPos, editor.value.length);
        } else {
          alert('Wikipedia editor not found. Make sure you are in editing mode.');
        }
      },
      args: [markup],
    });
  });
}

document.getElementById('searchQuery').focus();

