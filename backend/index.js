const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const cors = require('cors');

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
