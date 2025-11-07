/**
 * Form Component
 * This is a starter template for building custom forms on monday.com
 * Forms can be used to collect data and create items on boards
 */

import { useState } from 'react';
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

interface FormData {
  name: string;
  email: string;
  message: string;
}

const CustomForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    monday.setApiVersion('2023-10');

    try {
      // Example: Create an item on a board
      // Replace BOARD_ID with your actual board ID
      // const mutation = `mutation ($boardId: ID!, $itemName: String!) {
      //   create_item (board_id: $boardId, item_name: $itemName) {
      //     id
      //   }
      // }`;
      // const response = await monday.api(mutation, {
      //   variables: {
      //     boardId: 'YOUR_BOARD_ID',
      //     itemName: `${formData.name} - ${formData.email}`
      //   }
      // });
      
      // For now, just simulate success
      setTimeout(() => {
        setSubmitStatus('Form submitted successfully!');
        setIsSubmitting(false);
        setFormData({ name: '', email: '', message: '' });
      }, 1000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('Error submitting form. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h2>Custom Form</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>
            Name:
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
            Email:
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="message" style={{ display: 'block', marginBottom: '5px' }}>
            Message:
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
            rows={4}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0073ea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        {submitStatus && (
          <p style={{ marginTop: '10px', color: submitStatus.includes('Error') ? 'red' : 'green' }}>
            {submitStatus}
          </p>
        )}
      </form>
    </div>
  );
};

export default CustomForm;

