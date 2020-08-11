const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const firebase = require('./firebase');

require('firebase/firestore');

const port = 3001;
const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
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
  const { cars } = req.body;
  console.log(cars);
  cars.forEach((car) => {
    const studentIds = [];
    car.forEach((student) => {
      db.collection('students').add({
        first: student.first,
        last: student.last,
      }).then((docRef) => {
        studentIds.push(docRef.id);
      });
    });
    db.collection('cars').add({
      students: studentIds,
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
  db.collection('cars').doc(id).get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      data.students.forEach((student) => {
        db.collection('students').doc(student).get().then((studentDoc) => {
          const studentData = studentDoc.data();
          socket.emit('studentAdded', `${studentData.first} ${studentData.last}`);
        });
      });
    }
    res.send(200);
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
