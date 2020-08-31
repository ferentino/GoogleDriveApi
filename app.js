const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var counter = 0;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  
  const fs = require('fs');
  const readline = require('readline');
  const {google} = require('googleapis');
      
  const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
  const TOKEN_PATH = 'token.json';

  fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      authorize(JSON.parse(content),returnJson);
  });

  function authorize(credentials,callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
      
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
      });
  }
  function getAccessToken(oAuth2Client,callback) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      socket.emit('createAuth',authUrl)
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error retrieving access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log('Token stored to', TOKEN_PATH);
          });
          callback(oAuth2Client);
          console.log('teste')
        });
      });
  }
  
  function returnJson(auth){
    
    socket.on('returnJson',(msg)=>{
      const drive = google.drive({version: 'v3', auth});
      drive.files.list({
        q: msg ,
        filesize: 5, 
        fields: 'nextPageToken, files(id,name,mimeType,parents,version,webContentLink,webViewLink,owners,viewedByMe,viewedByMeTime,createdTime,modifiedTime, modifiedByMeTime,lastModifyingUser,fullFileExtension)',
        
      }, (err, res) => {
        var result = []
        if (err) return console.log('The API returned an error: ' + err);
        const files = res.data.files;
        if (files.length) {
          files.map((file)=>{
            result.push(
              file
            )
            socket.emit('returnJson',file);
          });
        } else {
          console.log('No files found.');
        }
        
      });
    })
  }
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});