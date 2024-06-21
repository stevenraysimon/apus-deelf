document.addEventListener('DOMContentLoaded', function() {
  const urlForm = document.getElementById('urlForm');
  const convertedHTMLDiv = document.getElementById('convertedHTML');
  const nextButton = document.getElementById('nextButton');
  let catchURL = '';
  let isLesson = false;

  urlForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    // Clear out convertedHTML
    convertedHTMLDiv.innerHTML = '';
    
    // Call the handle form submission
    await handleFormSubmission();
  });

  const hiddenToggles = document.getElementById('more-options');
  let isHidden = true;
  const hiddenContent = document.getElementById('hidden-toggles');
  
  hiddenToggles.addEventListener('click', function(event) {
      if (isHidden) {
          // Slide down the element
          hiddenContent.style.height = hiddenContent.scrollHeight + 'px';
      } else {
          // Slide up the element
          hiddenContent.style.height = '0';
      }
  
      // Toggle the state
      isHidden = !isHidden;
  });
  
  nextButton.addEventListener('click', async function(event) {
      event.preventDefault(); // Prevent the default button click behavior

      // Clear out convertedHTML
      convertedHTMLDiv.innerHTML = '';

      // Get the input URL
      const urlInput = document.getElementById('url');
      let url = urlInput.value.trim(); // Trim any leading or trailing whitespace

      // Check if the URL is valid
      if (!url.includes('https://myclassroom.apus.edu')) {
        alert('URL must include "https://myclassroom.apus.edu".');
        return;
      }

      // Get the next URL
      const nextURL = getNextSectionURL(url);

      console.log(nextURL);

      // Update the input field with the next URL
      urlInput.value = nextURL;

      // Get the updated URL after updating the input field
      url = urlInput.value.trim();

      catchURL = url;

      // Call the handle form submission
      await handleFormSubmission();
  });

  async function lessonCheck(){
    // Clear out convertedHTML
    convertedHTMLDiv.innerHTML = '';

    // Get the input URL
    const urlInput = catchURL;
    let url = urlInput; // Trim any leading or trailing whitespace

    // Check if the URL is valid
    if (!url.includes('https://myclassroom.apus.edu')) {
      alert('URL must include "https://myclassroom.apus.edu".');
      return;
    }

    // Get the next URL
    const nextURL = getNextLessonURL(url);

    // Update the input field with the next URL
    document.getElementById('url').value = nextURL;

    catchURL = url;

    // Call the handle form submission
    await handleFormSubmission();

    isLesson = false;
  }

  // Define a function to extract and increment the section number
  function getNextSectionURL(currentURL) {
    // Extract the section number from the URL
    const sectionMatch = currentURL.match(/Section_(\d+)\.html/);
    if (sectionMatch && sectionMatch[1]) {
        // Extracted section number
        let sectionNumber = parseInt(sectionMatch[1], 10);
        // Increment the section number
        sectionNumber++;
        // Format section number as two digits
        const formattedSectionNumber = sectionNumber.toString().padStart(2, '0');
        // Construct the next URL with the formatted section number
        const nextURL = currentURL.replace(`Section_${sectionMatch[1]}.html`, `Section_${formattedSectionNumber}.html`);
        return nextURL;
    }
    // If the URL format is unexpected, return null or handle it accordingly
    return null;
  }

  function getNextLessonURL(currentURL) {
    // Extract the lesson number from the URL
    const lessonMatch = currentURL.match(/lesson-?(\d+)\//); // Match "lesson-" followed by an optional hyphen
    if (lessonMatch && lessonMatch[1]) {
        // Extracted lesson number
        let lessonNumber = parseInt(lessonMatch[1], 10);
        // Increment the lesson number
        lessonNumber++;
        // Format lesson number as one digit
        const formattedLessonNumber = lessonNumber.toString();
        // Replace the lesson number in the URL, capturing both "lesson-" and "lesson" formats separately
        let nextURL = currentURL.replace(/(lesson-?)\d+\//, `$1${formattedLessonNumber}/`);
        // Replace the section number with "01"
        nextURL = nextURL.replace(/Section_(\d+)\.html/, 'Section_01.html');
        return nextURL;
    }
    // If the URL format is unexpected, return null or handle it accordingly
    return null;
}


  async function handleFormSubmission(){
    const urlInput = document.getElementById('url');
    const url = urlInput.value.trim(); // Trim any leading or trailing whitespace

    if (url === '') {
      alert('Please enter a URL.'); // Display an alert if the URL is empty
      return;
    }

    // Get the state of the checkbox
    const modalsCheckbox = document.getElementById('modals');
    const reverseModals = modalsCheckbox.checked;

    try {
      const response = await fetch('/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ originalHTMLUrl: url, reverseModals: reverseModals }) // Send the URL as 'originalHTMLUrl'
      });

      if (!response.ok) {
        throw new Error('Failed to convert HTML.');
      }

      const convertedHTML = await response.text(); // Get the converted HTML from the response
      convertedHTMLDiv.innerHTML = convertedHTML; // Display the converted HTML in the designated div

      // Change the background color to green
      convertedHTMLDiv.style.transition = 'background-color 0.1s';
      convertedHTMLDiv.style.backgroundColor = '#66FF99';
      // After 2 seconds, revert the background color back to its original color
      setTimeout(() => {
        convertedHTMLDiv.style.backgroundColor = ''; // Revert to original color (use your original color here)
      }, 300);

    } catch (error) {
      if (isLesson) {
          console.error('Error:', error.message);
          alert('Failed to convert HTML. Page might not exist.');
      } else {
          lessonCheck();
          isLesson = true;
      }
    }
  }

});