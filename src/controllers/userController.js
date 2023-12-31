import bcrypt from 'bcrypt';
import User from '../models/User';


export const getJoin = (req, res) => res.render('join', { pageTitle: 'Join' });

export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const pageTitle = 'Join';
  const exists = await User.exists({ $or: [{ username }, { email }] });
  if (password !== password2) {
    return res.status(400).render('join', {
      pageTitle,
      errorMessage: 'Password confirmation does not match.',
    });
  }
  if (exists) {
    return res.status(400).render('join', {
      pageTitle,
      errorMessage: 'This username/email is already taken.',
    });
  }
  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
    return res.redirect('/login');
  } catch (error) {
    return res.status(400).render('join', {
      pageTitle,
      errorMessage: error.message,
    });
  }
};

export const getLogin = (req, res) =>
  res.render('login', { pageTitle: 'Login' });

export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = 'Login';
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render('login', {
      pageTitle,
      errorMessage: 'An account with username does not exists.',
    });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render('login', {
      pageTitle,
      errorMessage: 'Wrong password.',
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  return res.redirect('/');
};

export const startGithubLogin = (req, res) => {
  const baseUrl = 'https://github.com/login/oauth/authorize';
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: 'read:user user:email',
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
  const baseUrl = 'https://github.com/login/oauth/access_token';
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    })
  ).json();
  if ('access_token' in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = 'https://api.github.com';
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find(
      (email) => email.primary === true && email.verified === true,
    );
    if (!emailObj) {
      // set notification
      return res.redirect('/login');
    }
    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.avatar_url,
        name: userData.name,
        username: userData.login,
        email: emailObj.email,
        password: '',
        socialOnly: true,
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    await req.session.save(); // issue #4724
    return res.redirect('/');
  }
  return res.redirect('/login');
};

export const logout = (req, res) => {
  req.flash('info', 'Bye Bye');
  req.session.destroy((err) => {
    if (err) {
      // handle error
    }
    return res.redirect('/');
  });
};

export const getEdit = (req, res) =>
  res.render('edit-profile', { pageTitle: 'Edit Profile' });

export const postEdit = async (req, res) => {
  const pageTitle = 'Edit Profile';
  const {
    session: {
      user: { _id, avatarUrl },
    },
    body: { name, email, username, location },
    file,
  } = req;

  const currentUser = req.session.user;

  if (currentUser.email !== email && (await User.exists({ email }))) {
    return res.status(400).render('edit-profile', {
      pageTitle,
      errorMessage: 'This email is already taken.',
    });
  }

  if (currentUser.username !== username && (await User.exists({ username }))) {
    return res.status(400).render('edit-profile', {
      pageTitle,
      errorMessage: 'This username is already taken.',
    });
  }

  const updatedFields = {
    name,
    email,
    username,
    location,
  };

  // 파일이 업로드된 경우, 파일을 저장하고 해당 파일의 경로를 사용하여 아바타 URL을 업데이트합니다.
  if (file) {
    const filePath = `/uploads/${file.filename}`;
    updatedFields.avatarUrl = filePath;
  }

  const updateUser = await User.findByIdAndUpdate(
    _id,
    updatedFields,
    { new: true },
  );

  req.session.user = updateUser;
  return res.redirect('/users/edit');
};



export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly === true) {
    req.flash('error', "Can't change password.");
    return res.redirect('/');
  }
  return res.render('users/change-password', { pageTitle: 'Change Password' });
};

export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    body: { oldPassword, newPassword, newPasswordConfirmation },
  } = req;
  const user = await User.findById(_id);

  // Output an error message if `oldPassword` is incorrect.
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) {
    return res.status(400).render('users/change-password', {
      pageTitle: 'Change Password',
      errorMessage: 'The current password is incorrect.',
    });
  }

  // Output an error message if `newPassword` and `newPasswordConfirmation` are
  // different.
  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).render('users/change-password', {
      pageTitle: 'Change Password',
      errorMessage: 'The password does not match the confirmation.',
    });
  }

  // Update the user's password.
  user.password = newPassword;
  await user.save();
  req.flash('info', 'Password updated');
  return res.redirect('/users/logout');
};

export const see = async (req, res) => {
  // To make it public, we get the id from `req.params`.
  const { id } = req.params;

  const user = await User.findById(id).populate({
    path: 'videos',
    populate: {
      path: 'owner',
      model: 'User',
    },
  });
  if (!user) {
    return res.status(404).render('404', { pageTitle: 'User not found.' });
  }

  return res.render('users/profile', {
    pageTitle: user.name,
    user,
  });
};