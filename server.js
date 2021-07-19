require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}


// database Configuration
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true})

const { Schema } = mongoose;

const shortUrlSchema = new Schema({
  original_url: { type: String, required: true }, // String is shorthand for {type: String}
  seq: { type:Number }
});

const UrlModel = mongoose.model('UrlModel', shortUrlSchema, 'UrlModel')
// UrlModel.createIndexes({seq: 1}, { unique: true }, )

// CRUD functions database
const findUrl = async (query) =>{
  const foundExistUrl = await UrlModel.findOne(query)
  return foundExistUrl;
}

const createAndSaveUrl = async (url, seq, done) => {
  const existUrl = await findUrl({original_url: url});
  let shortUrl = new UrlModel({
    original_url: url,
    seq: seq
  });
  
  if(existUrl){
    done(null, existUrl);
  }else{
    const response = await shortUrl.save()
    done(null, response);
  }
  
}

const getLastSequence = async () =>{
  const foundUrlSeq = await UrlModel.find().sort({seq: -1}).limit(1)
  return foundUrlSeq;
}

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// MiddleWare
app.use(express.urlencoded({extended: false}))

app.post('/api/shorturl', async function (req, res, next) { 
  let customData = {};
  
  const urlSeq = await getLastSequence();
  
  if (urlSeq.length > 0){
    customData.urlSeq = urlSeq[0]?._doc.seq + 1;
  }else{
    customData.urlSeq = 1;
  }
  res.locals.customData = customData;
  next();
 });

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// 

// Your first API endpoint
app.get('/api/shorturl/:id', function(req, res) {
  const {id} = req.params;

  findUrl({seq: id}).then((url)=>{
    let original_url = url?._doc.original_url || '/'
    res.redirect(original_url);
  });
    
});

app.get('/api/shorturl', function(req, res) {
  res.redirect('/');
});

app.post('/api/shorturl', function(req, res) {
  let {url} = req.body;
  const {urlSeq} = res.locals.customData
  let urlObj;
  let error;
  if (!url.trim()){
    url = `${req.protocol}://${req.headers.host}`
  }
  
  try{
    urlObj = new URL(url)
    if (!urlObj.protocol.includes('http')){
      error = "invalid url";
    }
  }catch(err){
    error = "invalid url";
  }
  if(error){
    res.json({error: "invalid url"});
  }else{

    createAndSaveUrl(urlObj.origin, urlSeq, (err, data) =>{
      if(err){
        console.log(err);
      } 
      else{
        let {original_url, seq} = data?._doc
        res.json({ original_url: original_url, short_url: seq });
      }
    })

    
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
