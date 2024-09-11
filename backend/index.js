const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { createWorker }  = require("tesseract.js");
const  pdf2img  = require('pdf-img-convert');
const { fromPath } = require("pdf2pic");
const path = require('path');
const Epub = require('epub-gen');
const sharp = require('sharp');
const pdfPoppler = require('pdf-poppler');
const { removeURLs } = require('./removeURLs');

const options = {
  density: 100,
  saveFilename: "input001",
  savePath: "./output",
  format: "png",
  width: 600,
  height: 600
};

const app = express();
const PORT = 5000;

const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}

app.use(cors(corsOptions))

app.use(cors());
app.use(express.json())

app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

var bookname ;
var writtername ;
var book_url ;


app.post('/scrapepage' , async ( req, res ) => {
    const { url } = req.body;
 

    if (!url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Example: Scraping the title of the page
        const pageTitle = $('title').text();

        // Extract the content of the page
        const content = [];
        $('.ld-tab-content p').each((i, element) => {
            content.push($(element).text());
            
        });


        // Customize this to scrape more data as needed
        const scrapedData = {
            title: pageTitle,
            content: content
        };

        res.send(scrapedData);
    } catch (error) {
        res.status(500).send({ error: 'Error scraping the webpage' });
    }

})

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send({ error: 'URL is required' });
    }

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Example: Scraping the title of the page
        const pageTitle = $('title').text();

        const pageDetail =  [];
        $('.ld-tab-content').each((i, element) => {
            pageDetail.push($(element).text());
            
        });
        // Extract the content of the page
        const content = [];
        $('.ld-item-list-item-preview a').each((i, element) => {
            content.push($(element).attr('href'));
            
        });


        // Customize this to scrape more data as needed
        const scrapedData = {
            title: pageTitle,
            detail: pageDetail,
            content: content
        };
        console.log(scrapedData);

        res.send(scrapedData);
    } catch (error) {
        res.status(500).send({ error: 'Error scraping the webpage' });
    }
});

app.post('/export', async (req, res) => {
    const { options } = req.body;

    if (!options) {
        return res.status(400).send({ error: 'options is required' });
    }

    try {
        console.log(options);
        const data = {
            status: "ok",
        };

        res.send(data);
    }catch (error) {
        res.status(500).send({ error: 'Error' });
    }
})

function inferBoldText(words) {
  const largeTextThreshold = 40; // Example threshold
  //console.log(words);
  words.forEach(word => {
    const { baseline } = word;
    
    if (baseline) {
      const height = baseline.y1 - baseline.y0;
      const width = baseline.x1 - baseline.x0;
     
      if (height < largeTextThreshold ) {
        console.log(`Large text detected: ${word.font_size}`);
        console.log(height + '-----' + width); 
        //console.log(word);
      }
    }
  });
  
}

const convertImage = async (image, lang) => {
    
    const worker = await createWorker(lang);
    let x = Math.floor((Math.random() * 1000) + 1);

    return new Promise((resolve, reject) => {
      sharp(image)
      .normalize() // Enhance contrast
      .toFile('./processed/image-' + x + '.png', (err, info) => {
        if (err) {
          console.error(err);
        } else {
          console.log(info);
          worker
          .recognize(image)
          .then(({ data: { text } }) => {
          // console.log('Detected text:', text);
            //inferBoldText(words);
            console.log(`Large Text Region ${index + 1}: ${text}`);
            //resolve('sdsdfg');  
          //  worker.terminate();
          
          })
          .catch(err => {
            reject(err);
            worker.terminate();
          });
         
          
        }
      });
    });
  };

const convertImage2Text = async image => {
    const image2TextResult = await convertImage(image, 'ben')
      .then(result => {
        return {
          imageId: image,
          text: result.data.text,
          processed: true,
          error: null
        };
      })
      .catch(err => {
        return {
          imageId: image,
          text: null,
          processed: false,
          error: err
        };
      });

    return image2TextResult;
}
function getFiles(dir, files = []) {
    // Get an array of all files and directories in the passed directory using fs.readdirSync
    const fileList = fs.readdirSync(dir)
    // Create the full path of the file/directory by concatenating the passed directory and file/directory name
    for (const file of fileList) {
      const name = `${dir}/${file}`
      // Check if the current file/directory is a directory using fs.statSync
      if (fs.statSync(name).isDirectory()) {
        // If it is a directory, recursively call the getFiles function with the directory path and the files array
       // getFiles(name, files)
      } else {
        // If it is a file, push the full path to the files array
        files.push(name)
      }
    }
    return files
  }


  
const directoryPath = path.join(__dirname, 'output_e'); 
const outputEpubPath = path.join(__dirname, 'output.epub'); 

const numberPattern = /\d+/;

const extractNumber = (fileName) => {
    const match = fileName.match(numberPattern);
    return match ? parseInt(match[0], 10) : NaN; // Return NaN if no number found
};
const readFileContent = (filePath) => {
  return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
              return reject(err);
          }
          resolve(data);
      });
  });
};
const collectFileContents = async (dir) => {

  try {

    const files = await fs.promises.readdir(dir);
    const textFiles = files.filter(file => path.extname(file) === '.txt');
  
    textFiles.sort((a, b) => {
      const numA = extractNumber(a);
      const numB = extractNumber(b);
      return numA - numB;
    });
  
    const fileContents = await Promise.all(textFiles.map(async file => {
      const filePath = path.join(dir, file);
      return fs.promises.readFile(filePath, 'utf-8');
    }));
    const cleanedText = removeURLs(fileContents.join('\n'));
    const mergedText =  cleanedText;
    return mergedText;

  }catch (error) {
    console.error('Error reading files:', error);
    throw error;
  }

};
const readAllTextFiles = async (dir) => {
      var contentall;

      const fabb = fs.readdir(dir, async (err, files) => {
          if (err) {
              console.error('Unable to scan directory:', err);
              return;
          }
          files.sort((a, b) => {
            const numA = extractNumber(a);
            const numB = extractNumber(b);
            return numA - numB;
          });
          for (const file of files) {
            const filePath = path.join(directoryPath, file);
            try {
                const content = await readFileContent(filePath);
                //console.log(`\nContents of ${file}:`);
               // console.log(content);
                contentall += content;
            } catch (err) {
                console.error(`Error reading file ${file}:`, err);
            }
        }
        return contentall;
      });
      console.log(fabb);
     
};
async function createEpub(mergedText, outputPath) {
  const option = {
    title: "",
    author: "",
    content: [
      {
        title: "Merged Text",
        data: mergedText
      }
    ],
    output: outputEpubPath
  };

  try {
    await new Epub(option).promise;
    console.log(`EPUB created at ${outputPath}`);
  } catch (error) {
    console.error('Error creating EPUB:', error);
  }
}

function splitIntoSentences(text) {
  // Define Bengali punctuation marks for sentence splitting
  // Bengali punctuation marks for sentence ending include:
  // - Full stop (।)
  // - Question mark (?)
  // - Exclamation mark (!)
  // Note: Regular punctuation splitting assumes some spaces following punctuation.
  const noNewlinesStr  = text.replace(/[\r\n]+/g, ' ');
  const parts = noNewlinesStr .split( /([।?!])/g);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        if (i + 1 < parts.length && /[।?!]/.test(parts[i + 1])) {
          result.push(parts[i] + parts[i + 1]);
          i++; // Skip the next element as it's already added
      } else {
          result.push(parts[i]);
      }
      }
  }
  return result;
}
function groupInto7LineParagraphs(sentences) {
  const paragraphs = [];
  let paragraph = [];
  
  sentences.forEach((sentence, index) => {
      paragraph.push(sentence);
      
      // Check if the paragraph has reached 7 lines
      if (paragraph.length === 7) {
          paragraphs.push(paragraph.join(' '));
          paragraph = []; // Reset for the next paragraph
      }
  });

  // Add any remaining sentences as the last paragraph
  if (paragraph.length > 0) {
      paragraphs.push(paragraph.join(' '));
  }

  return paragraphs;
}
  

app.listen(PORT, () => {
    
    /*(async function () {
        const options = {
            format: 'png',
            out_dir: './output',
            out_prefix: 'aimage-test',
            page: null
        };
        await pdfPoppler.convert("C:\\Users\\DoICT\\OneDrive\\Desktop\\web-scraper\\backend\\images\\input.pdf", options);
          
    })();*/
    /*(async function () {
        pdfArray = await pdf2img.convert('./images/input.pdf', {
            width: 3024,
            height: 3024,
            base64: false,
            scale: 2.0
          });
        console.log("saving");
        for (i = 0; i < pdfArray.length; i++){
          fs.writeFile("./output/image-"+i+".png", pdfArray[i], function (error) {
            if (error) { console.error("Error: " + error); }
          }); //writeFile
        } // for
        console.log("Saved");
      })();*/
     (async () => {
        
        var images = getFiles('./output');
        const getId = s => +s.match(/\d+(?=\D*$)/)[0] 
        images.sort((a, b) => getId(a) - getId(b));
        console.log(images);
        var results = await Promise.all(
            images.map(image => convertImage2Text(image))
        );
        //console.log(results);
        var i = 0;
        results.map(result => {
          const sentences = splitIntoSentences(result.text);

          const paragraphs = groupInto7LineParagraphs(sentences);

          var para = '';
          paragraphs.forEach((paragraph, index) => {
              console.log(`Paragraph ${index + 1}:`);
              //console.log(paragraph);
              console.log('---');
              para += '\n' + '<p>' +'\n'  + paragraph + '\n' + '</p>' + '\n\n';
          });
          fs.appendFile('./output_e/extracted-'+ i +'.txt', para, function (err) {
                if (err) throw err;
                console.log('Saved!');
          });
          i++;
        })

      })();
     /*(async () => {
        
          try {
            collectFileContents(directoryPath)
            .then(mergedText => {
              //console.log('Merged Text:', mergedText);
              return createEpub(mergedText, outputEpubPath );
            })
            .catch(error => {
              console.error('Error:', error);
            });
              
              //await generateEpub(contentList);
          } catch (err) {
              console.error('Error processing files:', err);
          }
        
      })();*/

      
     
    console.log(`Server is running on http://localhost:${PORT}`);
});
