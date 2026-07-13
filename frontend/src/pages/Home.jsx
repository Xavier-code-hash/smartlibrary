import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function Home() {
  return (
    <div className="home">
      <h1>Welcome to Smart Library</h1>
      <p>Browse, borrow, and manage books effortlessly.</p>
      <div className="home-actions">
        <Link to="/books"><Button variant="primary">Browse Books</Button></Link>
        <Link to="/search"><Button variant="outline">Search</Button></Link>
      </div>
    </div>
  );
}
