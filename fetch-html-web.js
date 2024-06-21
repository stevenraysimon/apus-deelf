const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');

/************** Working on May 1, 2024 ****************/

/************* Function to modify all components and set images ********************/

async function modifyBodyHTML(url, bodyHTML, imagesArrays, reverseModals) {
  // Perform any additional modifications to bodyHTML here

  const finalModifiedBodyHTML = bodyHTML.map((html) => {

    //Accordion
    html = html.replace(/<div(?:\s+[^>]*)?\s+class="accordion"[^>]*>/g, '<button type="button" class="btn btn-secondary expandall" aria-expanded="false">Open All Panels</button><div class="accordion">');
    html = html.replace(/<h3(\s+[^>]*)?class="accordion-tab"([^>]*)>([\s\S]*?)<\/h3>/g, '<div class="card"><div class="card-header"><h2 class="card-title"$1$2>$3</h2></div>');
    html = html.replace(/<div(?:\s+[^\s>]+="[^"]*")*\s+class="[^"]*accordion-panel(?:\s+[^"]*)?"(?:\s+[^\s>]+="[^"]*")*>([\s\S]*?)<\/div>/g, '<div class="collapse"><div class="card-body">$1</div></div></div>');

    //Tabs
    html = html.replace(/<div class="tabs"([^>]*)>([\s\S]*?)<\/div>/g, '<div class="tabs-wrapper tabs-horizontal"><div class="row"$1>$2</div>');
    html = html.replace(/<ul class="tablist"([^>]*)>([\s\S]*?)<\/ul>/g, '<div class="col-md-12"><div class="list-group flex-md-row text-center"$1>$2</div></div>');
    let isFirstListItem = true; 
    html = html.replace(/<li(?:\s+[^\s>]+="[^"]*")*\s+class="tab"(?:\s+[^\s>]+="[^"]*")*\s*>(?:<span>)?([^<]+)(?:<\/span>)?<\/li>/g, (match, p1) => {
      const replacement = `<a class="list-group-item list-group-item-action${isFirstListItem ? ' active' : ''}" data-toggle="list" role="tab">${p1}</a>`;
      isFirstListItem = false;
      return replacement;
    });   
    // html = html.replace(/<div\s+class="panels(?:\s+twelve)?(?:\s+columns)?">([\s\S]*?)<\/div>/g, '<div class="col-md-12"><div class="tab-content">$1</div>');
    html = html.replace(/<div[^>]*\bclass\s*=\s*"[^"]*\bpanels\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g, '<div class="col-md-12"><div class="tab-content">$1</div>');
    let isFirstTab = true;
    html = html.replace(/<div(?:\s+[^>\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*\s+class="[^"]*\bpanel\b[^"]*"(?:\s+[^>\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*>/g, () => {
        const replacement = `<div class="tab-pane fade${isFirstTab ? ' active show' : ''}" role="tabpanel" tabindex="0">`;
        isFirstTab = false;
        return replacement;
    });

    //Modal
    function generateRandomId() {
      const characters = 'abcdefghijklmnopqrstuvwxyz';
      let randomId = '';
      for (let i = 0; i < 5; i++) {
          randomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return randomId;
    }
    const dataTargetArray = [];
    // Get all instances of divs with class "modal" and iterate over each if any are found
    const modalMatches = html.match(/<div(?:\s+[^\s>]+="[^"]*")*\s+class="([^"]*modal[^"]*)"(?:\s+[^\s>]+="([^"]+)")?(?:\s+[^\s>]+="[^"]*")*>/g);
    if (modalMatches) {
        modalMatches.forEach((modalMatch) => {
            // Get a random ID for each modal
            const setModalId = generateRandomId();
            dataTargetArray.push(setModalId);

            // Replace the ID of the current modal with the random ID
            if (modalMatch) {
                const modalId = modalMatch.match(/id="([^"]+)"/)[1]; // Extract the existing ID attribute value
                html = html.replace(new RegExp(`id="${modalId}"`, 'g'), `id="${setModalId}"`);
            }

        });
    } 
    // Replace the buttons with modal
    html = html.replace(/<button(?:\s+[^\s>]+="[^"]*")*\s+class="([^"]*\btrigger\b[^"]*)"(?:\s+[^\s>]+="[^"]*")*>([\s\S]*?)<\/button>/g, (match, existingClasses, content) => {
        const buttonText = content.replace(/<img[^>]*>/, '').trim(); // Extract text content excluding the image tag
        const newClasses = existingClasses + ' btn btn-primary';
        return `<button type="button" data-toggle="modal" class="${newClasses}">${buttonText}</button>`;
    });
    // Replace the links with modal
    html = html.replace(/<a(?:\s+[^\s>]+="[^"]*")*\s+class="([^"]*trigger[^"]*)"(?:\s+[^\s>]+="[^"]*")*([^>]*)>([^<]+)<\/a>/g, (match, existingClasses, otherAttributes, linkText) => {
        const newClasses = existingClasses + ' modal-link';
        return `<a data-toggle="modal" class="${newClasses}">${linkText}</a>`;
    });
    // Attach data-targets in reverse order
    if(reverseModals === false){
      dataTargetArray.reverse();
    }
    html = html.replace(/(data-toggle="modal")/g, (match, p1) => {
      return `${p1} data-target="#${dataTargetArray.pop()}"`;
    });  
    html = html.replace(/class="modal hidden"/g, 'class="modal fade" tabindex="-1"');
    html = html.replace(/<div\s+class="lightbox">([\s\S]*?)<\/div>/g, '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-body">$1</div></div></div>');
    html = html.replace(/<div\s+(?=.*?\bclass="[^"]*\blightbox\b[^"]*")[\s\S]*?>[\s\S]*?<\/div>/g, (match) => {
      return '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-body">' + match + '</div></div></div>';
    });  
    html = html.replace(/<button\s+(?:\s*[^>\s]+="[^"]*")*\s+class\s*=\s*"(?:[^"]*\s+)?close(?:\s+[^"]*)?"(?:\s*[^>\s]+="[^"]*")*\s*>(.*?)<\/button>/g, '<button type="button" class="btn btn-secondary" data-dismiss="modal">$1</button>');
    html = html.replace(/<button(?:\s+[^\s>]+="[^"]*")*\s+class="close"(?:\s+[^\s>]+="[^"]*")*\s*(?:\s*\/)?>/gi, '<button type="button" class="btn btn-secondary" data-dismiss="modal">');

    //Carousel
    html = html.replace(/<div\s+class="[^"]*\bcarousel\b[^"]*"/g, '<div class="carousel" id="carousel" data-ride="carousel" data-interval="false">');
    const carouselControls = `
    <a class="carousel-control-prev bg-secondary" href="#carousel" role="button" data-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="sr-only">Previous</span>
    </a>
    <a class="carousel-control-next bg-secondary" href="#carousel" role="button" data-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="sr-only">Next</span>
    </a>`;
    html = html.replace(/<\/ul>\s*<\/div>\s*<\/li>/g, '</ul><p></p></div></li>');
    html = html.replace(/<ul\s+class="carousel-content([^>]*)>([\s\S]*?)<\/ul>\s*<\/div>/g, (match, attributes, content) => {
        const modifiedContent = content.replace(/<li\s+([^>]*)aria-hidden=["']?(\w+)["']?([^>]*)>\s*([\s\S]*?)\s*<\/li>/g, '<div class="carousel-item">$4</div>');
        // Add class active to the first carousel-item
        let isFirstItem = true;
        const modifiedInnerContent = modifiedContent.replace(/<div class="carousel-item">([\s\S]*?)<\/div>/g, (itemMatch, itemContent) => {
          const activeClass = isFirstItem ? ' active' : '';
          isFirstItem = false;
          return `<div class="carousel-item${activeClass}">${itemContent}</div>`;
        });
          return `<div class="carousel-inner"><div class="col-sm">${modifiedInnerContent}</div></div></div>${carouselControls}`;
    });  
    html = html.replace(/<\/div>\s*<li>/g, '</li><li>').replace(/<\/p>\s*<\/li>/g, '</p></div>');
    // Remove unnecessary fieldset and legend of class carousel
    html = html.replace(/<div[^>]*class="carousel"[^>]*>\s*(<legend[\s\S]*?<\/legend>)?\s*([\s\S]*?)<\/div>/g, '<div class="carousel slide" id="carousel" data-ride="carousel">$2</div>');
    html = html.replace(/<div[^>]*class="carousel"[^>]*>\s*(<fieldset[^>]*>[\s\S]*?<\/fieldset>)?\s*([\s\S]*?)<\/div>/g, '<div class="carousel slide" id="carousel" data-ride="carousel">$2</div>');
    // Replace the HTML snippet using a single line
    html = html.replace(/<fieldset\s+aria-label="carousel buttons"[\s\S]*?<\/fieldset>/g, '');
    html = html.replace(/<fieldset[^>]*aria-controls="carousel"[^>]*>((?:.|[\n\r])*?)<\/fieldset>/g, '');
    //Remove extra ending tag
    html = html.replace(/(data-ride="carousel">)aria-live="polite">/g, '$1');
    html = html.replace(/<legend>(.*?)<\/legend>/g, '<h2>$1</h2>');

  
    //Knowledge Check
    html = html.replace(/<div class="kc"([^>]*)>([\s\S]*?)<div[^>]*class="[^"]*\bcorrect\b[^"]*"[^>]*>([\s\S]*?)<\/div>([\s\S]*?)<\/div>/g, function(match, p1, p2, p3, p4) {
        // Replace the first <p> tag with nothing
        p3 = p3.replace(/<p[^>]*>([\s\S]*?)<\/p>/, '');
        // Return the modified match
        return '<div class="kc"' + p1 + '>' + p2 + '<div class="collapse feedback">' + p3 + '</div>' + p4;
    });
    html = html.replace(/<div class="kc"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*\bincorrect\b[^"]*"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<\/div>/g, '<div class="kc">$1$2</div>');
    html = html.replace(/<div class="kc"[^>]*>\s*<h2([^>]*)>([\s\S]*?)<\/h2>\s*<form[^>]*>([\s\S]*?)<\/form>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g, '<form class="quick-assess quick-assess-mc"><fieldset class="radio"><legend$1>$2</legend>$3$4</div></fieldset></form>');
    const feedback = '<button type="button" data-toggle="collapse" aria-expanded="false" disabled="" class="btn btn-primary btn-quick-assess">Check Answer</button>';
    const choicesRegex = /<ul[^>]*class="choices"[^>]*>([\s\S]*?)<\/ul>/g;
    const formDivRegex = /(<\/form>\s*<\/div>)/g;
    // Replace choices content
    html = html.replace(choicesRegex, `<div class="choices">$1</div>${feedback}`);
    // Add feedback button after each form and div closing tags
    html = html.replace(/<li tabindex="0" role="(radio|checkbox)"(?: aria-checked="false")?>\s*<input type="(?:radio|checkbox)" name="choice" value="(ab[0-9]+correct)"(?: aria-checked="false")?>\s*<label>(.*?)<\/label>\s*<\/li>/g, `<div class="form-check pl-2">
        <div class="row">
            <div class="col-1 pr-0 pr-sm-1">
                <span class="fas fa-check ans-symbol invisible float-right"></span>
            </div>
            <div class="col-11">
                <input type="radio" name="MC-answer" class="" value="$2">
                <label class="radio-label">
                    $3
                </label>
            </div>
        </div>
    </div>`);
    html = html.replace(/<li tabindex="0" role="(radio|checkbox)"(?: aria-checked="false")?>\s*<input type="(?:radio|checkbox)" name="choice" value="(ab[0-9]+incorrect)"(?: aria-checked="false")?>\s*<label>(.*?)<\/label>\s*<\/li>/g, `<div class="form-check pl-2">
        <div class="row">
            <div class="col-1 pr-0 pr-sm-1">
                <span class="fas fa-times ans-symbol invisible float-right"></span>
            </div>
            <div class="col-11">
                <input type="radio" name="MC-answer" class="" value="$2">
                <label class="radio-label">
                    $3
                </label>
            </div>
        </div>
    </div>`);

    //Code Block
    html = html.replace(/<!-- HTML generated using hilite\.me -->\s*<div[^>]*>\s*<p[^>]*>\s*([\s\S]*?)\s*<\/p>\s*<\/div>/g, '<pre><code class="language-html">$1</code></pre>');

    // Replace instances of class "five" while keeping other classes
    html = html.replace(/<div class="five columns offset-by-one">/g, '<div class="col-md-12">');
    html = html.replace(/<div class="ten columns offset-by-one">/g, '<div class="col-md-12">');

    //iFrames
    html = html.replace(/<iframe(?:\s+\w+="[^"]*")*\s+src=["'](.*?\.html)["'](?:\s+\w+="[^"]*")*\s*\/?>/g, (match, iframeSrc) => {
      // Check if the iframe source includes the extension ".html"
      if (iframeSrc.includes('.html')) {
          // Remove the last section from the URL
          const urlWithoutLastSection = url.replace(/\/[^\/]+\.html$/, '/');

          if (iframeSrc.includes('https://')) {
              // Prepend the modified URL to the iframe source
              return `<iframe src="${iframeSrc}" frameborder="no" scrolling="no">`;
          } else{
              // Prepend the modified URL to the iframe source
              return `<iframe src="${urlWithoutLastSection}${iframeSrc}" frameborder="no" scrolling="no">`;
          }
      } else {
          // Keep the original iframe source if it doesn't include ".html"
          return match;
      }
  });
    
    // Add more modifications as needed
  
    return html;
  }); 
  
  //Images
  const imagesModifiedBodyHTML = finalModifiedBodyHTML.map((html, index) => {
    let currentIndex = 0;
    const modifiedHtml = html.replace(/<img\b(?:[^>]*)\bsrc=["'](.*?)["'](?:[^>]*)>/g, (match, p1) => {
        const imageUrl = imagesArrays[index][currentIndex];
        currentIndex = (currentIndex + 1) % imagesArrays[index].length;
        return `<img src="${imageUrl}" >`;
    });
    return modifiedHtml;
  });

  return imagesModifiedBodyHTML;
}

/**********************************************************************************/

async function extractBackgroundImage(page) {
  const backgroundImage = await page.evaluate(() => {
    const section = document.querySelector('.elf section');
    if (!section) {
      console.error('Error: .elf section not found');
      return { backgroundImage: null };
    }

    const backgroundStyle = window.getComputedStyle(section).getPropertyValue('background-image');
    const match = backgroundStyle.match(/url\("(.+)"\)/);
    const backgroundImage = match ? match[1] : null;

    if (backgroundImage === null) {
      console.error('Error: Background image not found');
    }

    console.log('Captured Background Image:', backgroundImage);

    return { backgroundImage };
  });

  return backgroundImage;
}

// Function to extract background image URL and prepend it to every image file name
const extractAndPrependUrlToImages = async (page, url) => {
  // Extract the background image URL
  const { backgroundImage } = await extractBackgroundImage(page);

  // Extract every image URL for each bodyHTML
  const imagesArrays = await page.evaluate(() => {
    const columnsList = document.querySelector('section').querySelectorAll('.columns');
    const imagesArrays = [];
  
    columnsList.forEach((columns) => {
      const imageElements = columns.querySelectorAll('img');
      const allImageUrls = new Set();
  
      imageElements.forEach((img) => {
        const imageUrl = img.getAttribute('src');
        allImageUrls.add(imageUrl);
      });
  
      // Convert the set to an array
      const uniqueImageUrls = Array.from(allImageUrls);
  
      // Add the unique array to the imagesArrays
      imagesArrays.push(uniqueImageUrls);
    });
  
    return imagesArrays;
  });

  // Prepend the URL to every image URL and replace part of the URL for each array
  const modifiedImagesArrays = imagesArrays.map((imageArray) => {
    return imageArray.map((imageUrl) => {
      let lastSlashIndex = url.lastIndexOf('/');
      let modifiedUrl = url.substring(0, lastSlashIndex + 1);
      let updatedUrl;
      if (imageUrl.includes('https://')) {
          updatedUrl = imageUrl;
      } else{
          updatedUrl = modifiedUrl + imageUrl;
      }
      return updatedUrl;
    });
  });

  return { backgroundImage, modifiedImagesArrays };
};

/****************** Fetch the HTML ****************************/

async function fetchHTML(url, reverseModals) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const bodyContent = await page.evaluate(() => {
    // Select all script elements
    const scriptElements = document.querySelectorAll('script');

    let selection;

    /****************** Column Selection *********************/

    if (document.querySelector('section > .carousel')) {
      selection = document.querySelectorAll('section');
    } else if (document.querySelector('section > .modal')) {
      selection = document.querySelectorAll('section');
    } else {
      selection = document.querySelector('section').querySelectorAll('.columns:not(.columns .columns)');
    }

    /****************** End Column Selection *********************/

    // Remove the last two script elements
    scriptElements[scriptElements.length - 1].remove();
    scriptElements[scriptElements.length - 2].remove();

    // Count occurrences of the class 'columns' within the first section
    const columnsCount = (selection || []).length || 0;

    // Function to remove inline styles from elements, excluding .elf section background-image
    const elementsWithInlineStyles = document.querySelectorAll('[style]');
    elementsWithInlineStyles.forEach((element) => {
            const inlineStyles = element.getAttribute('style');
            // Check if the inline styles contain 'background-image'
            if (inlineStyles.includes('background-image')) {
              console.log(`Element '${element}' has inline style of background-image`);
            } else{
                element.removeAttribute('style');
            }
    });

    // Return the innerHTML of the body and the count
    const columnsList = selection;
    const bodyHTML = Array.from(columnsList).map((column) => column.innerHTML);


    return { bodyHTML, columnsCount };
  });

  // Extract and prepend URL to every image source
  const { backgroundImage, modifiedImagesArrays } = await extractAndPrependUrlToImages(page, url);

  // Get modified bodyHTML and imagesArrays from the functions
  const modifiedBodyHTML = await modifyBodyHTML(url, bodyContent.bodyHTML, modifiedImagesArrays, reverseModals);

  await browser.close();

  // Header content
  const header = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <link rel="stylesheet" href="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/bootstrap-4.3.1/css/bootstrap.min.css">
        <link rel="stylesheet" href="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/fontawesome-free-5.9.0-web/css/all.min.css">
        <link rel="stylesheet" href="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/css/styles.min.css">
        <link rel="stylesheet" href="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/css/custom.css">
        <link rel="stylesheet" href="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/highlight/styles/a11y-dark.css">
        <title>APUS Content</title>
    </head>
    <style>
        body {
            background: linear-gradient(rgba(0,0,0,0.12) 0%, rgba(255,255,255,0.87) 100%), url("${backgroundImage}");
            background-size: cover;
            background-repeat: no-repeat;
            height: auto;
            min-height: 100vh;
        }
        .backgroundFade {
            background: rgba(255,255,255,0.85);
            padding: 10px;
        }
        img, iframe{
          width: 100%;
          height: auto;
        }
        footer p img{
          width: auto;
        }
        .carousel{
          //background-color: white;
          color: black;
          overflow: hidden;
        }
        .carousel h3, .carousel h2{
          color: lightblue;
        }
        .carousel-caption {
          position: relative !important;
          right: 0 !important;
          bottom: 0 !important;
          left: 0 !important;
        }
        .carousel-inner > div {
          padding: 0 150px;
          box-sizing: border-box;
        }
        table tr:nth-child(odd) {
          background-color: #eeeeee;
        }
        table td{
          padding: 5px;
          box-sizing: border-box;
        }
        .tab-content{
          border: solid #c4c6c7;
          border-width: 0 1px 1px;
          padding: 8px;
          box-sizing: border-box;
        }
        .modal-link{
          color: #0057AD !important;
          cursor: pointer;
        }
        .modal{
          padding-top: 0 !important;
        }
    </style>
    <body>
      <div class="container-fluid">
        <div class="row">
          <div class="col-12 offset-md-1 col-md-10 offset-lg-2 col-lg-8 backgroundFade">
              <div class="row">`;

  const twelveColumnOpen = `<div class="col-md-12">`;

  const sixColumnOpen = `<div class="col-md-6">`;

  const columnFinish = `</div>`;

  // Footer content
  const footer = `</div>
          <div class="col-12">
                            <footer>
                                <!-- <p>© [Client] [Year]</p> -->
                                <p><img src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/img/logo.png" alt="logo"
                                        class="img-fluid"></p>
                            </footer>
          </div>
      </div>
    </div>
  </div>
        <p>
            <script src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/jquery/jquery-3.4.1.min.js">
            </script>
            <script src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/popper-js/popper.min.js">
            </script>
            <script
                src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/bootstrap-4.3.1/js/bootstrap.min.js">
            </script>
        </p>
        <!-- Template JavaScript -->
        <p>
            <script src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/js/scripts.min.js"></script>
            <!-- Highlight Code -->
            <script src="/shared/LCS_HTML_Templates/apus_Template_2020/_assets/thirdpartylib/highlight/highlight.min.js"></script>
            <script>hljs.highlightAll();</script>
        </p>
    </body>
    </html>`;

  // Instead of logging to console, construct the HTML content
  let generatedHTML;
  if (bodyContent.columnsCount >= 6) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[1]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[2]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[3]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[4]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[5]}${columnFinish}${footer}`;
  } else if (bodyContent.columnsCount >= 5) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[1]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[2]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[3]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[4]}${columnFinish}${footer}`;
  } else if (bodyContent.columnsCount >= 4) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[1]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[2]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[3]}${columnFinish}${footer}`;
  } else if (bodyContent.columnsCount === 3) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[1]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[2]}${columnFinish}${footer}`;
  } else if (bodyContent.columnsCount === 2) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${twelveColumnOpen}${modifiedBodyHTML[1]}${columnFinish}${footer}`;
  } else if (bodyContent.columnsCount === 1) {
      generatedHTML = `${header}${twelveColumnOpen}${modifiedBodyHTML[0]}${columnFinish}${footer}`;
  }

  console.log(`Number of occurrences of class 'columns': ${bodyContent.columnsCount}`);

  // Return the generated HTML content
  return generatedHTML;

}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//Send html to server
module.exports = fetchHTML;