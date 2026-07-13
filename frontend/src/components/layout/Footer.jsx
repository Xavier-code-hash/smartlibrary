import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Smart Library Management System</p>
      </div>
    </footer>
  );
}
