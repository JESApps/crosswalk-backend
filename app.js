const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const firebase = require('./firebase');

require('firebase/firestore');

const port = process.env.PORT || 3001;
const app = express();

const corsOptions = {
  origin: '*',
};
app.use(cors(corsOptions));

app.use(express.json());

const db = firebase.firestore();
let socket;

app.post('/login', (req, res) => {
  console.log('posted to login');
  if (firebase.currentUser) {
    res.send({
      user: firebase.currentUser,
    });
  } else {
    console.log(req.body);
    const { email, password } = req.body;
    console.log('email', email);
    console.log('password', password);
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        res.send({
          user: userCredential.user,
        });
      });
  }
});

app.post('/csv_upload', (req, res) => {
  const { students } = req.body;
  console.log(students);
  students.forEach((student) => {
    db.collection('students').add({
      first: student.first,
      last: student.last,
    });
  });
  res.send(200);
});

app.post('/checkIn/:id', (req, res) => {
  const { id } = req.params;
  if (!socket) {
    console.log('socket is undefined');
    res.send(500);
  }
  db.collection('students').doc(id).get().then((doc) => {
    if (doc.exists) {
      const studentData = doc.data();
      socket.emit('studentAdded', `${studentData.first} ${studentData.last}`);
      res.sendStatus(200);
    } else {
      res.sendStatus(500);
    }
  });
});

app.get('/students/:id', (req, res) => {
  const { id } = req.params;
  db.collection('students').get(id).then((doc) => {
    if (doc.exists) {
      const studentData = doc.data();
      res.send({ student: `${studentData.first} ${studentData.last}` });
    } else {
      res.sendStatus(500);
    }
  });
});

app.get('/students', (req, res) => {
  db.collection('students').get().then((snapshot) => {
    const students = [];
    snapshot.docs.forEach((doc) => {
      const { first, last } = doc.data();
      students.push({ id: doc.id, first, last });
    });
    res.send({ students });
  });
});

// app.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (_socket) => {
  console.log('New client connected');
  socket = _socket;
});

server.listen(port, () => console.log(`Listening on port ${port}`));
