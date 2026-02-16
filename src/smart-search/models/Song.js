/**
 * Song data model with validation
 * Represents a song entity with all required metadata fields
 */
class Song {
  /**
   * Create a Song instance
   * @param {Object} data - Song data object
   * @param {string} data.id - Unique song identifier
   * @param {string} data.title - Song title
   * @param {string} data.movie - Movie name
   * @param {string} data.artist - Artist name
   * @param {string} data.album - Album name
   * @param {string} data.language - Song language
   * @param {string[]} data.moods - Array of mood tags
   * @param {string[]} data.tags - Array of general tags
   * @param {number} data.playCount - Number of times played
   * @param {number} data.createdAt - Creation timestamp
   */
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.movie = data.movie;
    this.artist = data.artist;
    this.album = data.album;
    this.language = data.language;
    this.moods = data.moods || [];
    this.tags = data.tags || [];
    this.playCount = data.playCount || 0;
    this.thumbnail = data.thumbnail || '';
    this.createdAt = data.createdAt;
  }

  /**
   * Validate song data integrity
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];

    // Required string fields
    if (!this.id || typeof this.id !== 'string' || this.id.trim() === '') {
      errors.push('id is required and must be a non-empty string');
    }

    if (!this.title || typeof this.title !== 'string' || this.title.trim() === '') {
      errors.push('title is required and must be a non-empty string');
    }

    if (!this.movie || typeof this.movie !== 'string' || this.movie.trim() === '') {
      errors.push('movie is required and must be a non-empty string');
    }

    if (!this.artist || typeof this.artist !== 'string' || this.artist.trim() === '') {
      errors.push('artist is required and must be a non-empty string');
    }

    if (!this.album || typeof this.album !== 'string' || this.album.trim() === '') {
      errors.push('album is required and must be a non-empty string');
    }

    if (!this.language || typeof this.language !== 'string' || this.language.trim() === '') {
      errors.push('language is required and must be a non-empty string');
    }

    if (!this.thumbnail || typeof this.thumbnail !== 'string' || this.thumbnail.trim() === '') {
      errors.push('thumbnail is required and must be a non-empty string');
    }

    // Array fields
    if (!Array.isArray(this.moods)) {
      errors.push('moods must be an array');
    } else if (this.moods.some(mood => typeof mood !== 'string')) {
      errors.push('all moods must be strings');
    }

    if (!Array.isArray(this.tags)) {
      errors.push('tags must be an array');
    } else if (this.tags.some(tag => typeof tag !== 'string')) {
      errors.push('all tags must be strings');
    }

    // Numeric fields
    if (typeof this.playCount !== 'number' || this.playCount < 0) {
      errors.push('playCount must be a non-negative number');
    }

    if (!this.createdAt || typeof this.createdAt !== 'number' || this.createdAt <= 0) {
      errors.push('createdAt is required and must be a positive number (timestamp)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if the song data is valid
   * @returns {boolean} True if valid, false otherwise
   */
  isValid() {
    return this.validate().isValid;
  }

  /**
   * Create a Song instance from Firebase data
   * @param {string} id - Song ID
   * @param {Object} data - Firebase song data
   * @returns {Song} Song instance
   */
  static fromFirebase(id, data) {
    return new Song({
      id,
      ...data
    });
  }

  /**
   * Convert Song instance to plain object for Firebase
   * @returns {Object} Plain object representation
   */
  toFirebase() {
    return {
      title: this.title,
      movie: this.movie,
      artist: this.artist,
      album: this.album,
      language: this.language,
      moods: this.moods,
      tags: this.tags,
      playCount: this.playCount,
      thumbnail: this.thumbnail,
      createdAt: this.createdAt
    };
  }

  /**
   * Create a copy of the song
   * @returns {Song} New Song instance with same data
   */
  clone() {
    return new Song({
      id: this.id,
      title: this.title,
      movie: this.movie,
      artist: this.artist,
      album: this.album,
      language: this.language,
      moods: [...this.moods],
      tags: [...this.tags],
      playCount: this.playCount,
      thumbnail: this.thumbnail,
      createdAt: this.createdAt
    });
  }
}

module.exports = Song;
