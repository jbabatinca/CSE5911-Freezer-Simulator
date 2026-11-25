/** AboutModal.ts - renders the About panel listing everyone who contributed to Freeze Tag. App.ts handles open/close. */

interface Contributor {
  name: string;
  role: string;
  description: string;
}

interface ContributorGroup {
  heading: string;
  people: Contributor[];
}

// Edit these lists to update the About panel. Add one object per person.
// Keep descriptions to 1-2 sentences.
const contributorGroups: ContributorGroup[] = [
  {
    heading: 'Course Instructor',
    people: [
      {
        name: 'Dauntrica Woods',
        role: 'Course Instructor',
        description: 'CSE 5911 Capstone: Software Applications instructor',
      },
    ],
  },
  {
    heading: 'Sponsor',
    people: [
      {
        name: 'Andrew Frueh',
        role: 'Project Sponsor',
        description: 'College of Nursing faculty member and Freeze Tag project sponsor.',
      },
    ],
  },
  {
    heading: 'Subject Matter Experts',
    people: [
      {
        name: 'Abeir Khalid',
        role: 'Lab Manager',
        description: 'College of Nursing lab manager',
      },

      {
        name: 'Erik Ferrin',
        role: 'Lab Manager',
        description: 'College of Nursing lab manager',
      },
    ],
  },
  {
    heading: 'Developers',
    people: [
      {
        name: 'Jehona Babatinca',
        role: 'Developer',
        description: 'Computer Science and Engineering senior student at The Ohio State University. ',
      },

      {
        name: 'Mohamad Khawanda',
        role: 'Developer',
        description: 'Computer Science and Engineering senior student at The Ohio State University. ',
      },

      {
        name: 'Adam Novak',
        role: 'Developer',
        description: 'Computer Science and Engineering senior student at The Ohio State University. ',
      },
    ],
  },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function AboutModal(): string {
  const groupsHtml = contributorGroups.map(group => `
    <section class="about-group">
      <h3>${escapeHtml(group.heading)}</h3>
      <ul class="about-list">
        ${group.people.map(person => `
          <li class="about-person">
            <div class="about-person-header">
              <span class="about-person-name">${escapeHtml(person.name)}</span>
              <span class="about-person-role">${escapeHtml(person.role)}</span>
            </div>
            <p>${escapeHtml(person.description)}</p>
          </li>
        `).join('')}
      </ul>
    </section>
  `).join('');

  return `
    <div class="modal-overlay" id="about-modal-overlay">
      <div class="modal-content about-modal" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
        <h2 id="about-modal-title">About Freeze Tag</h2>
        <p class="about-intro">Freeze Tag was built as a CSE 5911 Capstone project at The Ohio State University. These are the people who made it.</p>
        ${groupsHtml}
        <button id="btn-close-about">Close</button>
      </div>
    </div>
  `;
}