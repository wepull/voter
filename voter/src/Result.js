import React, { Component } from 'react';
// import roost from './assets/roost.png';
// import k3d from './assets/k3d.svg';
// import kind from './assets/kind.png';
// import minikube from './assets/minikube.png';
// import docker from './assets/docker.png';
import kubernates from './assets/kubernates.png';
import './App.css';

const ballot_endpoint =
	process.env.REACT_APP_BALLOT_ENDPOINT ||
	window.env.ballotEndpoint ||
	'roost-controlplane:30080';
const ec_server_endpoint =
	process.env.REACT_APP_EC_SERVER_ENDPOINT ||
	window.env.ecServerEndpoint ||
	'roost-controlplane:30081';
let date = new Date();

class Result extends Component {
	constructor(props) {
		super(props);
		this.state = {
			candidates: [],
			results: [],
			total_votes: 0,
		};
	}

	componentDidMount() {
		fetch(`http://${ballot_endpoint}`, {
			method: 'GET',
		})
			.then((response) => {
				if (response.ok) {
					return response.json();
				}
				throw new Error('ballot service unavailable');
			})
			.then((response) => {
				// console.log('In resposnse: ', response);
				date = new Date();
				this.setState({ results: response.results });
				this.setState({ total_votes: response.total_votes });
			})
			.catch((error) => {
				console.error('error getting ballot results: ', error);
				this.setState({ results: [] });
				this.setState({ total_votes: 0 });
			});
		fetch(`http://${ec_server_endpoint}`, {
			method: 'GET',
		})
			.then((response) => response.json())
			.then((response) => {
				this.setState({ candidates: response.Candidates });
			})
			.catch((error) => {
				console.error(
					'ballot service is not reachable at http://' + ec_server_endpoint
				);
			});
	}

	render() {
		const CustomCard = (candidate, index) => {
			return (
				<div className="card" key={index}>
					<div className="cardBackgroundContainer">
						<div className="cardBackground"></div>
						<div className="cardBackgroundImage">
							{this.state.candidates.map((c,i) => {
								if (c.Name === candidate.candidate_id) {
									return <img
										src={c.ImageUrl}
										width="150px"
										height="150px"
										className="image"
										alt={c.Name}
										key={i}
									/>;
								}
								return <div key={i}></div>
							})}
							{/* {candidate.candidate_id === 'roost' ? (
								<img
									src={roost}
									width="150px"
									height="150px"
									className="image"
								/>
							) : null}
							{candidate.candidate_id === 'docker' ? (
								<img
									src={docker}
									width="150px"
									height="150px"
									className="image"
								/>
							) : null}
							{candidate.candidate_id === 'minikube' ? (
								<img
									src={minikube}
									width="150px"
									height="150px"
									className="image"
								/>
							) : null}
							{candidate.candidate_id === 'k3d' ? (
								<img src={k3d} width="150px" height="150px" className="image" />
							) : null}
							{candidate.candidate_id === 'kind' ? (
								<img
									src={kind}
									width="150px"
									height="150px"
									className="image"
								/>
							) : null} */}
						</div>
					</div>
					<div className="cardContent">
						{candidate.candidate_id}
						<div className="progressbar_back">
							<div
								className="progressbar_front"
								style={{
									width: `${Math.round(
										(candidate.vote_count / this.state.total_votes) * 100
									)}%`,
								}}
							></div>
							<div>
								{Math.round(
									(candidate.vote_count / this.state.total_votes) * 100
								)}
								%
							</div>
						</div>
					</div>
				</div>
			);
		};
		if (this.state.results === null || this.state.results.length < 1) {
			return (
				<div className="Home">
					<div className="heading">No votes has been given</div>
				</div>
			);
		}
		return (
			<div className="Home">
				<div className="logo">
					<img src={kubernates} width="70px" height="70px" alt={"logo"}/>
				</div>
				<div className="heading">
					Developers preference for building K8S cluster, as of{' '}
					{date.toLocaleString()}
				</div>
				<div className="cardContainer">
					{this.state.results.map((candidate, index) => {
						return CustomCard(candidate, index);
					})}
				</div>
			</div>
		);
	}
}

export default Result;
